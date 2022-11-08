import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../helper-hardhat-config";

const deployMockV3Aggregator: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId: number = network.config.chainId!;

    if (chainId === 31337) {
        const MockV3Aggregator = await deploy("MockV3Aggregator", {
            from: deployer,
            args: [8, 200000000000],
            log: true,
            autoMine: true,
        });
        console.log("Mocks Deployed!!!");
        console.log("------------------------------------------");
    }
};
export default deployMockV3Aggregator;
deployMockV3Aggregator.tags = ["all", "mocks"];
