import dotenv from 'dotenv'
dotenv.config()

export const config = {
    account: process.env.ACCOUNT_ADDRESS || "",
    privateKey: process.env.PRIVATE_KEY || ""
}