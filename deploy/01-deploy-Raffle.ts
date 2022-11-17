import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../helper-hardhat-config";
import verify from "../utils/verify";

const deployRaffle: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId: number = network.config.chainId!;
    const COORDINATOR_FUND_AMOUNT = ethers.utils.parseEther("30");

    let PriceFeedAddress, CoordinatorAddress: string;
    let subscriptionId: number;

    if (chainId === 31337 /*31337 is the hardhat and local host chain Id*/) {
        const PriceFeedContract = await ethers.getContract("MockV3Aggregator");
        PriceFeedAddress = PriceFeedContract.address;
        const CoordinatorContract = await ethers.getContract("VRFCoordinatorV2Mock");
        CoordinatorAddress = CoordinatorContract.address;
        // Create subscription on local hh
        const transactionResponse = await CoordinatorContract.createSubscription();
        const transactionReciept = await transactionResponse.wait(1);
        subscriptionId = transactionReciept.events[0].args.subId;
        // Fund the Subscription
        await CoordinatorContract.fundSubscription(subscriptionId, COORDINATOR_FUND_AMOUNT);
    } else {
        PriceFeedAddress = networkConfig[chainId]["ethPriceFeedAddress"]!;
        CoordinatorAddress = networkConfig[chainId]["coordinatorAddress"]!;
        subscriptionId = networkConfig[chainId]["subscriptionId"]!;
    }
    const minEntryFee = networkConfig[chainId]["minEntryFee"];
    const timeInterval = networkConfig[chainId]["timeInterval"];
    const keyHash = networkConfig[chainId]["keyHash"];
    const requestConfirmations = networkConfig[chainId]["requestConfirmations"];
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];

    console.log("Deploying Raffle.....");

    const args: [number, string, string, string, string, number, number, number] = [
        minEntryFee,
        timeInterval,
        PriceFeedAddress,
        CoordinatorAddress,
        keyHash,
        subscriptionId,
        requestConfirmations,
        callbackGasLimit,
    ];

    const Raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        autoMine: true,
        waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
    });

    console.log("Raffle deployed!!!");
    console.log("----------------------------------------------------");

    if (chainId !== 31337 && process.env.ETHERSCAN_API_KEY) {
        await verify(Raffle.address, args);
    }
};
export default deployRaffle;
deployRaffle.tags = ["all", "Raffle"];
