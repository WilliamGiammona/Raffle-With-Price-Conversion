import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, deployments, ethers } from "hardhat";
import { networkConfig } from "../../helper-hardhat-config";
import { MockV3Aggregator, Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

network.config.chainId !== 31337
    ? describe.skip
    : describe("Raffle", function () {
          let Raffle: Raffle;
          let MockV3Aggregator: MockV3Aggregator;
          let VRFCoordinatorV2Mock: VRFCoordinatorV2Mock;
          let deployer: SignerWithAddress;
          let player1: SignerWithAddress;
          const VAL = ethers.utils.parseEther(".025");
          const chainId = network.config.chainId!;

          beforeEach(async function () {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              player1 = accounts[1];
              await deployments.fixture(["all"]); //Runs every deployment w/ all tag
              Raffle = await ethers.getContract("Raffle", deployer);
              MockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
              VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              Raffle = await Raffle.connect(deployer);
              const subscriptionId = Raffle.getSubscriptionId();
              await VRFCoordinatorV2Mock.addConsumer(subscriptionId, Raffle.address);
          });

          describe("constructor", function () {
              it("Correctly sets the minEntryFee", async function () {
                  assert.equal((await Raffle.getMinEntryFee()).toString(), "50000000000000000000");
              });

              it("Correctly sets the timeInterval", async function () {
                  assert.equal((await Raffle.getTimeInterval()).toString(), networkConfig[chainId]["timeInterval"]);
              });

              it("Correctly sets the priceFeed address", async function () {
                  assert.equal(await Raffle.getPriceFeedContract(), MockV3Aggregator.address);
              });

              it("Correctly sets the coordinator address", async function () {
                  assert.equal(await Raffle.getCoordinatorContract(), VRFCoordinatorV2Mock.address);
              });

              it("Correctly sets the keyHash", async function () {
                  assert.equal((await Raffle.getKeyHash()).toString(), networkConfig[chainId]["keyHash"]);
              });

              it("Correctly sets the requestConfirmations", async function () {
                  assert.equal(
                      (await Raffle.getRequestConfirmations()).toString(),
                      networkConfig[chainId]["requestConfirmations"].toString()
                  );
              });

              it("Correctly sets the CallbackGasLimit", async function () {
                  assert.equal(
                      (await Raffle.getCallbackGasLimit()).toString(),
                      networkConfig[chainId]["callbackGasLimit"].toString()
                  );
              });

              it("Correctly sets the raffle state", async function () {
                  assert.equal(await Raffle.getRaffleState(), 0);
              });

              it("Correctly initializes the timeStamp", async function () {
                  let timeStamp: boolean;
                  const date = new Date().getTime().toString().slice(0, -3);
                  (await Raffle.getTimeStamp()).toString() > date ? (timeStamp = true) : (timeStamp = false);
                  assert.equal(timeStamp, true);
              });
          });

          describe("enterRaffle", function () {
              it("Reverts if RaffleState isn't open", async function () {
                  await Raffle.enterRaffle({ value: VAL });
                  await network.provider.send("evm_increaseTime", [Number(networkConfig[chainId]["timeInterval"]) + 1]);
                  await network.provider.send("evm_mine", []);
                  await Raffle.requestRandomWords();
                  Raffle = await Raffle.connect(player1);
                  await expect(Raffle.enterRaffle({ value: VAL })).to.be.revertedWithCustomError(
                      Raffle,
                      "Raffle__NotOpen"
                  );
              });
              it("Reverts if too little ETH sent", async function () {
                  await expect(
                      Raffle.enterRaffle({ value: ethers.utils.parseEther(".02499999999") })
                  ).to.be.revertedWithCustomError(Raffle, "Raffle__NotEnoughETH");
              });

              it("Reverts if the participant is already in the raffle", async function () {
                  await Raffle.enterRaffle({ value: VAL });
                  Raffle = Raffle.connect(player1);
                  await Raffle.enterRaffle({ value: VAL });
                  Raffle = Raffle.connect(deployer);
                  await expect(Raffle.enterRaffle({ value: VAL })).to.be.revertedWithCustomError(
                      Raffle,
                      "Raffle__AlreadyInRaffle"
                  );
              });

              it("Adds the user to the participant array", async function () {
                  await Raffle.enterRaffle({ value: VAL });
                  assert.equal((await Raffle.getParticipants(0)).toString(), deployer.address);
              });

              it("Emits the participant after they are added to the participants array", async function () {
                  await expect(Raffle.enterRaffle({ value: VAL }))
                      .to.emit(Raffle, "EnteredRaffle")
                      .withArgs(deployer.address);
              });
          });

          describe("receive", function () {
              beforeEach(async function () {
                  const transactionHash = await player1.sendTransaction({
                      to: Raffle.address,
                      value: VAL,
                  });
              });

              it("Called the enterRaflfle function", async function () {
                  assert.equal((await Raffle.getParticipants(0)).toString(), player1.address);
              });
          });

          describe("fallback", function () {
              beforeEach(async function () {
                  const transactionHash = await player1.sendTransaction({
                      to: Raffle.address,
                      value: VAL,
                      data: "0x1234",
                  });
              });

              it("Called the enterRaflfle function", async function () {
                  assert.equal((await Raffle.getParticipants(0)).toString(), player1.address);
              });
          });
          describe("requestRandomWords", function () {
              it("Reverts if not enough time has passed", async function () {
                  await Raffle.enterRaffle({ value: VAL });
                  await expect(Raffle.requestRandomWords()).to.be.revertedWithCustomError(
                      Raffle,
                      "Raffle__NotEnoughTimeSinceLastRaffle"
                  );
              });

              it("Reverts if Raffle State isn't open", async function () {
                  await Raffle.enterRaffle({ value: VAL });
                  await network.provider.send("evm_increaseTime", [Number(networkConfig[chainId]["timeInterval"]) + 1]);
                  await network.provider.send("evm_mine", []);
                  await Raffle.requestRandomWords();
                  await expect(Raffle.requestRandomWords()).to.be.revertedWithCustomError(Raffle, "Raffle__NotOpen");
              });

              it("Reverts if not enough participants", async function () {
                  await network.provider.send("evm_increaseTime", [Number(networkConfig[chainId]["timeInterval"]) + 1]);
                  await network.provider.send("evm_mine", []);
                  await expect(Raffle.requestRandomWords()).to.be.revertedWithCustomError(
                      Raffle,
                      "Raffle__NotEnoughParticipants"
                  );
              });

              it("It changes the Raffle Status to calculating", async function () {
                  assert.equal((await Raffle.getRaffleState()).toString(), "0");
                  await Raffle.enterRaffle({ value: VAL });
                  await network.provider.send("evm_increaseTime", [Number(networkConfig[chainId]["timeInterval"]) + 1]);
                  await network.provider.send("evm_mine", []);
                  await Raffle.requestRandomWords();
                  assert.equal((await Raffle.getRaffleState()).toString(), "1");
              });

              it("Returns a request Id", async function () {
                  await Raffle.enterRaffle({ value: VAL });
                  await network.provider.send("evm_increaseTime", [Number(networkConfig[chainId]["timeInterval"]) + 1]);
                  await network.provider.send("evm_mine", []);
                  const test = await Raffle.callStatic.requestRandomWords();
                  let bool = false;
                  if (test.toNumber() > 0) {
                      bool = true;
                  }
                  assert.equal(bool, true);
              });

              it("Emits RequestSent", async function () {
                  await Raffle.enterRaffle({ value: VAL });
                  await network.provider.send("evm_increaseTime", [Number(networkConfig[chainId]["timeInterval"]) + 1]);
                  await network.provider.send("evm_mine", []);
                  await expect(Raffle.requestRandomWords()).to.emit(Raffle, "RequestSent");
              });
          });
      });
