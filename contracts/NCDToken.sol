// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title NCDToken
 * @notice Tokenised Negotiable Certificate of Deposit — tradeable on secondary market.
 *         Investor buys at a discounted price; at maturity the full face value
 *         is paid to the current owner.  No coupons — the discount IS the yield.
 */
contract NCDToken is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable issuer;
    address public investor;
    address public currentOwner;
    uint256 public startDate;
    uint256 public maturityDate;
    uint256 public faceValue;
    uint256 public interestRate;      // basis points
    uint256 public discountedValue;   // price investor actually pays (< faceValue)
    IERC20  public immutable stablecoin;
    bool    public issued;
    bool    public expired;

    event Issued(address indexed investor, uint256 discountedValue);
    event NCDTransferred(address indexed from, address indexed to, uint256 price);
    event Redeemed(uint256 faceValue, uint256 timestamp, address to);
    event Expired();

    constructor(
        address _issuer,
        uint256 _startDate,
        uint256 _maturityDate,
        uint256 _faceValue,
        uint256 _interestRate,
        uint256 _discountedValue,
        address _stablecoin
    ) {
        require(_issuer != address(0), "Invalid issuer");
        require(_stablecoin != address(0), "Invalid stablecoin");
        require(_discountedValue <= _faceValue, "Discount exceeds face value");
        issuer          = _issuer;
        startDate       = _startDate;
        maturityDate    = _maturityDate;
        faceValue       = _faceValue;
        interestRate    = _interestRate;
        discountedValue = _discountedValue;
        stablecoin      = IERC20(_stablecoin);
    }

    modifier notExpired() {
        require(!expired, "NCD expired");
        _;
    }

    /**
     * @notice Investor accepts the NCD, paying the discounted price to the issuer.
     */
    function acceptAndIssue(address _investor) external nonReentrant notExpired {
        require(!issued, "Already issued");
        require(_investor != address(0), "Invalid investor");

        stablecoin.safeTransferFrom(_investor, issuer, discountedValue);

        investor = _investor;
        currentOwner = _investor;
        issued = true;

        emit Issued(_investor, discountedValue);
    }

    /**
     * @notice Transfer the NCD to a new owner at a negotiated price.
     *         Buyer approves this contract for `price`; current owner calls this.
     */
    function transferNCD(address newOwner, uint256 price) external nonReentrant notExpired {
        require(issued, "NCD not issued");
        require(msg.sender == currentOwner, "Only current owner can transfer");
        require(newOwner != address(0), "Invalid new owner");
        require(price > 0, "Price must be > 0");

        stablecoin.safeTransferFrom(newOwner, currentOwner, price);

        address oldOwner = currentOwner;
        currentOwner = newOwner;

        emit NCDTransferred(oldOwner, newOwner, price);
    }

    /**
     * @notice At maturity, issuer pays full face value to current owner.
     *         Issuer must approve this contract for faceValue.
     */
    function redeemMaturity() external nonReentrant notExpired {
        require(msg.sender == issuer, "Only issuer can redeem");
        require(issued, "Not yet issued");
        require(block.timestamp >= maturityDate, "Not yet matured");

        stablecoin.safeTransferFrom(issuer, currentOwner, faceValue);

        expired = true;
        emit Redeemed(faceValue, block.timestamp, currentOwner);
        emit Expired();
    }
}
