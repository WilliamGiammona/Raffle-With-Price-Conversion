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
              Raffle = await ethers.getContract("Raffle", deployer);
              raffleEntranceFee = await Raffle.getMinEntryFee();
          });

          describe("fulfillRandomWords", function () {
              it("Works with Chainlinks Price Feed and VRF contracts", async function () {
                  await new Promise((resolve, reject) => {
                      Raffle.once("RequestFulfilled", async () => {
                          console.log("RequestFulfilled event fired");
                          try {
                          } catch (error) {
                              reject(error);
                          }
                      });
                  });
              });
          });
      });
