// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TermDepositToken
 * @notice Tokenised term deposit — NOT tradeable.
 *         Investor deposits face value with issuer. At maturity, issuer returns
 *         face value + interest to the investor.
 */
contract TermDepositToken is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public immutable issuer;
    address public investor;
    uint256 public startDate;
    uint256 public maturityDate;
    uint256 public faceValue;
    uint256 public interestRate;   // basis points (e.g. 500 = 5%)
    uint256 public interestAmount; // pre-calculated interest in stablecoin units
    IERC20  public immutable stablecoin;
    bool    public issued;
    bool    public expired;

    event Issued(address indexed investor, uint256 faceValue);
    event Redeemed(uint256 faceValue, uint256 interestAmount, uint256 timestamp, address to);
    event Expired();

    constructor(
        address _issuer,
        uint256 _startDate,
        uint256 _maturityDate,
        uint256 _faceValue,
        uint256 _interestRate,
        uint256 _interestAmount,
        address _stablecoin
    ) {
        require(_issuer != address(0), "Invalid issuer");
        require(_stablecoin != address(0), "Invalid stablecoin");
        issuer         = _issuer;
        startDate      = _startDate;
        maturityDate   = _maturityDate;
        faceValue      = _faceValue;
        interestRate   = _interestRate;
        interestAmount = _interestAmount;
        stablecoin     = IERC20(_stablecoin);
    }

    modifier notExpired() {
        require(!expired, "Term deposit expired");
        _;
    }

    /**
     * @notice Investor accepts the term deposit, paying face value to issuer.
     */
    function acceptAndIssue(address _investor) external nonReentrant notExpired {
        require(!issued, "Already issued");
        require(_investor != address(0), "Invalid investor");

        stablecoin.safeTransferFrom(_investor, issuer, faceValue);

        investor = _investor;
        issued = true;

        emit Issued(_investor, faceValue);
    }

    /**
     * @notice At maturity, issuer returns face value + interest to investor.
     *         Issuer must approve this contract for (faceValue + interestAmount).
     */
    function redeemMaturity() external nonReentrant notExpired {
        require(msg.sender == issuer, "Only issuer can redeem");
        require(issued, "Not yet issued");
        require(block.timestamp >= maturityDate, "Not yet matured");

        uint256 totalPayout = faceValue + interestAmount;
        stablecoin.safeTransferFrom(issuer, investor, totalPayout);

        expired = true;
        emit Redeemed(faceValue, interestAmount, block.timestamp, investor);
        emit Expired();
    }
}
