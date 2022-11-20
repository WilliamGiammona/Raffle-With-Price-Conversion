import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { isAddress } from "ethers/lib/utils";
import { network, deployments, ethers, getNamedAccounts } from "hardhat";
import { networkConfig } from "../../helper-hardhat-config";
import { MockV3Aggregator, Raffle, VRFCoordinatorV2Mock } from "../../typechain-types";

network.config.chainId == 31337
    ? describe.skip
    : describe("Raffle", function () {
          let Raffle: Raffle;
          let deployer: string;
          let raffleEntranceFee: BigNumber;

          const chainId = network.config.chainId!;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              Raffle = await ethers.getContractAt("Raffle", "0xA1935720A0e597CB239969C63Bc28acD104a1F8A");
              raffleEntranceFee = await Raffle.getMinEntryFee();
          });

          describe("fulfillRandomWords", function () {
              it("Works with Chainlinks Price Feed and VRF contracts", async function () {
                  console.log("Setting up test...");
                  const startingTimeStamp = await Raffle.getTimeStamp();
                  const accounts = await ethers.getSigners();
                  console.log("Setting up Listener...");

                  await new Promise<void>(async (resolve, reject) => {
                      Raffle.once("RequestFulfilled", async () => {
                          try {
                              console.log("RequestFulfilled event fired");
                              const Winner = await Raffle.getWinner();
                              const raffleState = await Raffle.getRaffleState();
                              const winnerEndingBalance = await accounts[0].getBalance();
                              const endingTimeStamp = await Raffle.getTimeStamp();

                              await expect(Raffle.getParticipants(0)).to.be.revertedWithPanic(50);
                              assert.equal(Winner.toString(), accounts[0].address);
                              assert.equal(raffleState, 0);
                              assert.equal(
                                  winnerEndingBalance.toString(),
                                  winnerStartingBalance.add(raffleEntranceFee).toString()
                              );
                              assert(endingTimeStamp > startingTimeStamp);
                              resolve();
                          } catch (error) {
                              reject(error);
                          }
                      });

                      console.log("Entering Raffle...");
                      const txResponse = await Raffle.enterRaffle({ value: raffleEntranceFee });
                      await txResponse.wait(1);
                      console.log("Ok, time to wait...");
                      const winnerStartingBalance = await accounts[0].getBalance();
                      setTimeout(async () => {
                          await Raffle.requestRandomWords();
                      }, 6000);
                  });
              });
          });
      });
