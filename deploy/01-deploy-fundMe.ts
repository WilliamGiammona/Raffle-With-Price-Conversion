import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../helper-hardhat-config";
import verify from "../utils/verify";

const deployFundMe: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId: number = network.config.chainId!;

    let ethUsdPriceFeedAddress: string = "hi";
    if (chainId === 31337) {
        const ethUsdPriceFeed = (await deployments.get("MockV3Aggregator"))!;
        ethUsdPriceFeedAddress = ethUsdPriceFeed.address;
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId].ethUsdPriceFeed!;
    }

    console.log("----------------------------------------------------");
    console.log("Deploying FundMe.....");

    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: [ethUsdPriceFeedAddress, 50],
        log: true,
        autoMine: true,
        waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
    });

    console.log("Fund me deployed!!!");
    console.log("----------------------------------------------------");

    if (chainId !== 31337 && process.env.ETHERSCAN_API_KEY) {
        await verify(fundMe.address, [ethUsdPriceFeedAddress, 50]);
    }
};
export default deployFundMe;
deployFundMe.tags = ["all", "fundMe"];
