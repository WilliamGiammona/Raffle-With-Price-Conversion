import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, deployments, ethers } from "hardhat";
import { FundMe, MockV3Aggregator } from "../../typechain-types";

network.config.chainId !== 31337
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe: FundMe;
          let mockV3Aggregator: MockV3Aggregator;
          let deployer: SignerWithAddress;
          let player1: SignerWithAddress;
          const VAL = ethers.utils.parseEther(".025");

          beforeEach(async function () {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              player1 = accounts[1];
              await deployments.fixture(["all"]);
              fundMe = await ethers.getContract("FundMe", deployer);
              mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
              fundMe = await fundMe.connect(deployer);
          });

          describe("constructor", function () {
              it("sets the aggregator addresses correctly", async function () {
                  const txResponse = await fundMe.getPriceFeed();
                  assert.equal(txResponse, mockV3Aggregator.address);
              });

              it("sets the minUsd correctly", async function () {
                  const txResponse = await fundMe.getMinUsd();
                  assert.equal(txResponse.toString(), "50");
              });
          });

          describe("fund", function () {
              it("reverts if too little ETH sent", async function () {
                  await expect(
                      fundMe.fund({ value: ethers.utils.parseEther(".02499999999") })
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotEnoughEth");
              });

              it("Adds the funder", async function () {
                  await fundMe.fund({ value: VAL });
                  assert.equal(await fundMe.getFunders(0), deployer.address);
              });

              it("Adds the funder's amount to the AddressToAmountFunded mapping", async function () {
                  await fundMe.fund({ value: VAL });
                  assert.equal((await fundMe.getAddressToAmountFunded(deployer.address)).toString(), VAL.toString());
              });
          });

          describe("receive", function () {
              beforeEach(async function () {
                  const transactionHash = await deployer.sendTransaction({
                      to: fundMe.address,
                      value: VAL,
                  });
              });
              it("calls the fund function", async function () {
                  assert.equal((await ethers.provider.getBalance(fundMe.address)).toString(), VAL.toString());
              });

              it("reverts if too little ETH sent", async function () {
                  await expect(
                      deployer.sendTransaction({
                          to: fundMe.address,
                          value: ethers.utils.parseEther(".02499999999"),
                          gasLimit: 5000000,
                      })
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotEnoughEth");
              });

              it("Adds the funder", async function () {
                  assert.equal(await fundMe.getFunders(0), deployer.address);
              });

              it("Adds the funder's amount to the AddressToAmountFunded mapping", async function () {
                  assert.equal((await fundMe.getAddressToAmountFunded(deployer.address)).toString(), VAL.toString());
              });
          });

          describe("fallback", function () {
              beforeEach(async function () {
                  const transactionHash = await deployer.sendTransaction({
                      to: fundMe.address,
                      value: VAL,
                      data: "0x1234",
                  });
              });
              it("calls the fund function", async function () {
                  assert.equal((await ethers.provider.getBalance(fundMe.address)).toString(), VAL.toString());
              });

              it("reverts if too little ETH sent", async function () {
                  await expect(
                      deployer.sendTransaction({
                          to: fundMe.address,
                          value: ethers.utils.parseEther(".02499999999"),
                          data: "0x1234",
                          gasLimit: 5000000,
                      })
                  ).to.be.revertedWithCustomError(fundMe, "FundMe__NotEnoughEth");
              });

              it("Adds the funder", async function () {
                  assert.equal(await fundMe.getFunders(0), deployer.address);
              });

              it("Adds the funder's amount to the AddressToAmountFunded mapping", async function () {
                  assert.equal((await fundMe.getAddressToAmountFunded(deployer.address)).toString(), VAL.toString());
              });
          });

          describe("withdraw", function () {
              beforeEach(async function () {
                  await fundMe.fund({ value: VAL });
              });
              it("It reverts if called by nonowner", async function () {
                  fundMe = await fundMe.connect(player1);
                  await expect(fundMe.withdraw()).to.be.revertedWith("Ownable: caller is not the owner");
              });

              it("sends the money correctly", async function () {
                  const beginningDeployerBalance = await ethers.provider.getBalance(deployer.address);
                  const beginningFundMeTreasury = await ethers.provider.getBalance(fundMe.address);
                  const beginningTotal = beginningDeployerBalance.add(beginningFundMeTreasury);
                  const txResponse = await fundMe.withdraw();
                  const txReceipt = await txResponse.wait(1);
                  const endingDeployerBalance = await ethers.provider.getBalance(deployer.address);
                  const { gasUsed, effectiveGasPrice } = txReceipt;
                  const gasCost = gasUsed.mul(effectiveGasPrice);
                  const beginningTotalMinusGas = beginningTotal.sub(gasCost);
                  assert.equal(beginningTotalMinusGas.toString(), endingDeployerBalance.toString());
              });

              it("clears the treasury", async function () {
                  await fundMe.withdraw();
                  const treasury = await ethers.provider.getBalance(fundMe.address);
                  assert.equal(treasury.toString(), "0");
              });

              it("clears the funders array", async function () {
                  await fundMe.withdraw();
                  await expect(fundMe.getFunders(0)).to.be.revertedWithPanic(50);
              });

              it("clears the addressToAmountFunded Mapping", async function () {
                  await fundMe.withdraw();
                  assert.equal((await fundMe.getAddressToAmountFunded(deployer.address)).toString(), "0");
              });
          });
      });
