import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../helper-hardhat-config";

const deployMosk: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId: number = network.config.chainId!;

    const args: any[] = [];

    if (chainId === 31337) {
        console.log("Deploying Mocks...");

        const MockContract = await deploy("MyContract", {
            from: deployer,
            args: [args],
            log: true,
            autoMine: true,
            waitConfirmations: networkConfig[network.name].blockConfirmations || 1,
        });
        console.log("Mocks Deployed!!!");
        console.log("------------------------------------------");
    }
};
export default deployMockV3Aggregator;
deployMockV3Aggregator.tags = ["all", "mocks"];
