import express from "express"
import { loginUser, signUpUser } from "../Controllers/userContoller.js"

const userRouter=express.Router()

userRouter.post("/signup",signUpUser)
        .post("/login",loginUser)

export default userRouter