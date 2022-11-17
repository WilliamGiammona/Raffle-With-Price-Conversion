import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, deployments, ethers } from "hardhat";
import { Raffle } from "../../typechain-types";

network.config.chainId === 31337
    ? describe.skip
    : describe("Raffle", function () {
          let Raffle: Raffle;
          let deployer: SignerWithAddress;
          const VAL = ethers.utils.parseEther(".025");

          beforeEach(async function () {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              Raffle = await ethers.getContract("Raffle", deployer.address);
          });
          it("Does Something", async function () {});
      });
