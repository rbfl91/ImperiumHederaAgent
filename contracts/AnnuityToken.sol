// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AnnuityToken is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Basic asset fields
    address public immutable issuer;
    address public investor;      
    address public currentOwner; 
    uint256 public startDate;
    uint256 public maturityDate;
    uint256 public faceValue;
    uint256 public interestRate; 
    uint256[] public couponDates;
    uint256[] public couponValues;
    IERC20 public immutable stablecoin;
    bool public issued;
    bool public expired;

    // track paid coupons to avoid double-payments
    mapping(uint256 => bool) public couponPaid;

    // Events
    event Issued(address indexed investor, uint256 faceValue);
    event CouponPaid(uint256 indexed index, uint256 value, uint256 timestamp, address to);
    event AnnuityTransferred(address indexed from, address indexed to, uint256 price);
    event Redeemed(uint256 faceValue, uint256 timestamp, address to);
    event Expired();

    constructor(
        address _issuer,
        uint256 _startDate,
        uint256 _maturityDate,
        uint256 _faceValue,
        uint256 _interestRate,
        uint256[] memory _couponDates,
        uint256[] memory _couponValues,
        address _stablecoin
    ) {
        require(_issuer != address(0), "Invalid issuer");
        require(_stablecoin != address(0), "Invalid stablecoin");
        require(_couponDates.length == _couponValues.length, "Mismatched coupons");
        issuer = _issuer;
        startDate = _startDate;
        maturityDate = _maturityDate;
        faceValue = _faceValue;
        interestRate = _interestRate;
        couponDates = _couponDates;
        couponValues = _couponValues;
        stablecoin = IERC20(_stablecoin);
    }

    modifier notExpired() {
        require(!expired, "Annuity expired");
        _;
    }

    // Investor accepts the annuity and pays face value to the issuer.
    // Workflow: Investor must approve this contract for faceValue before calling. Atomic settlement is performed.
    function acceptAndIssue(address _investor) external nonReentrant notExpired {
        require(!issued, "Already issued");
        require(_investor != address(0), "Invalid investor");

        // Pull face value from investor to issuer (requires investor approval)
        stablecoin.safeTransferFrom(_investor, issuer, faceValue);

        // set state after successful transfer (atomic settlement)
        investor = _investor;
        currentOwner = _investor;
        issued = true;

        emit Issued(_investor, faceValue);
    }

    // Pay a coupon by index. Pays to the current owner.
    // Workflow: Issuer must approve this contract to move couponValues[index] prior to calling, or issuer may call and use safeTransfer instead of approving.
    function payCoupon(uint256 index) external nonReentrant notExpired {
        require(msg.sender == issuer, "Only issuer can pay coupons");
        require(index < couponValues.length, "Invalid coupon index");
        require(!couponPaid[index], "Coupon already paid");

        // Transfer coupon from issuer -> currentOwner (issuer must have approved this contract)
        stablecoin.safeTransferFrom(issuer, currentOwner, couponValues[index]);
        couponPaid[index] = true;

        emit CouponPaid(index, couponValues[index], block.timestamp, currentOwner);
    }

    // Transfer the annuity to a new owner for a price in stablecoin.
    // Workflow: buyer approves this contract for `price`. Then the seller (currentOwner) calls this function.
    function transferAnnuity(address newOwner, uint256 price) external nonReentrant notExpired {
        require(issued, "Annuity not issued");
        require(msg.sender == currentOwner, "Only current owner can initiate transfer");
        require(newOwner != address(0), "Invalid new owner");
        require(price > 0, "Price must be > 0");

        // Pull price from buyer (newOwner) to the current owner (buyer must approve this contract)
        stablecoin.safeTransferFrom(newOwner, currentOwner, price);

        address oldOwner = currentOwner;
        currentOwner = newOwner;

        emit AnnuityTransferred(oldOwner, newOwner, price);
    }

    // Redeem face value at maturity.
    // Workflow: Called by issuer when contract matured. Transfers faceValue from issuer to current owner.
    function redeemMaturity() external nonReentrant notExpired {
        require(msg.sender == issuer, "Only issuer can redeem");
        require(block.timestamp >= maturityDate, "Not yet matured");

        // Transfer directly from issuer to currentOwner
        stablecoin.safeTransfer(currentOwner, faceValue);

        expired = true;
        emit Redeemed(faceValue, block.timestamp, currentOwner);
        emit Expired();
    }

    function getCouponCount() external view returns (uint256) {
        return couponValues.length;
    }

    function getCouponValue(uint256 index) external view returns (uint256) {
        require(index < couponValues.length, "Invalid index");
        return couponValues[index];
    }

    function getCouponDate(uint256 index) external view returns (uint256) {
        require(index < couponDates.length, "Invalid index");
        return couponDates[index];
    }

    function isCouponPaid(uint256 index) external view returns (bool) {
        require(index < couponValues.length, "Invalid index");
        return couponPaid[index];
    }
}