import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, deployments, ethers } from "hardhat";
import { FundMe } from "../../typechain-types";

network.config.chainId === 31337
    ? describe.skip
    : describe("FundMe", function () {
          let fundMe: FundMe;
          let deployer: SignerWithAddress;
          const VAL = ethers.utils.parseEther(".025");

          beforeEach(async function () {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              fundMe = await ethers.getContract("FundMe", deployer.address);
          });
          it("Allows people to fund and withdraw", async function () {
              await fundMe.fund({ value: VAL, gasLimit: 300000 });
              await fundMe.withdraw({ gasLimit: 300000 });
              const endingFundMeBalance = await ethers.provider.getBalance(fundMe.address);
              assert.equal(endingFundMeBalance.toString(), "0");
          });
      });
