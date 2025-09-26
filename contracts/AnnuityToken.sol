// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AnnuityToken {
    using SafeERC20 for IERC20;

    // Basic asset fields
    address public issuer;
    address public investor;      // original investor
    address public currentOwner;  // current owner (changes on secondary trades)
    uint256 public startDate;
    uint256 public maturityDate;
    uint256 public faceValue;
    uint256 public interestRate; // basis points (optional semantics)
    uint256[] public couponDates;
    uint256[] public couponValues;
    IERC20 public stablecoin;
    bool public issued;

    // track paid coupons to avoid double-payments
    mapping(uint256 => bool) public couponPaid;

    // Events
    event Issued(address indexed investor, uint256 faceValue);
    event CouponPaid(uint256 indexed index, uint256 value, uint256 timestamp, address to);
    event AnnuityTransferred(address indexed from, address indexed to, uint256 price);

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

    //Investor accepts the annuity and pays face value to the issuer.
    //Investor must approve this contract for faceValue before calling.
    function acceptAndIssue(address _investor) external {
        require(!issued, "Already issued");
        investor = _investor;
        // Pull face value from investor to issuer
        stablecoin.safeTransferFrom(investor, issuer, faceValue);
        issued = true;

        // set current owner to the investor on issue
        currentOwner = investor;

        emit Issued(investor, faceValue);
    }

    //Pay a coupon by index. Pays to the current owner.
    //Issuer must approve this contract to move couponValues[index] prior to calling.
    function payCoupon(uint256 index) external {
        require(msg.sender == issuer, "Only issuer can pay coupons");
        require(index < couponValues.length, "Invalid coupon index");
        require(!couponPaid[index], "Coupon already paid");

        // Transfer coupon from issuer -> currentOwner
        stablecoin.safeTransferFrom(issuer, currentOwner, couponValues[index]);
        couponPaid[index] = true;

        emit CouponPaid(index, couponValues[index], block.timestamp, currentOwner);
    }

    //Transfer the annuity to a new owner for a price in stablecoin.
    //Workflow: buyer approves this contract for `price`. Then the seller (currentOwner) calls this function.
    function transferAnnuity(address newOwner, uint256 price) external {
        require(issued, "Annuity not issued");
        require(msg.sender == currentOwner, "Only current owner can initiate transfer");
        require(newOwner != address(0), "Invalid new owner");

        // Pull price from buyer (newOwner) to the current owner
        // newOwner must have approved this contract for `price`.
        stablecoin.safeTransferFrom(newOwner, currentOwner, price);

        address oldOwner = currentOwner;
        currentOwner = newOwner;

        emit AnnuityTransferred(oldOwner, newOwner, price);
    }

    //Returns number of coupons
    function getCouponCount() external view returns (uint256) {
        return couponValues.length;
    }

    //Helper to view coupon value
    function getCouponValue(uint256 index) external view returns (uint256) {
        require(index < couponValues.length, "Invalid index");
        return couponValues[index];
    }

    //Helper to view coupon date
    function getCouponDate(uint256 index) external view returns (uint256) {
        require(index < couponDates.length, "Invalid index");
        return couponDates[index];
    }
}
