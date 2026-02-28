import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import { emailRgex,passwordRegex,usernameRegex } from "../utils/pattern.js";

interface loginDetails{
    credentials?:string,
    password:string
}

interface signupDetails extends loginDetails{
    username:string,
    email:string,
    password:string,
    name:string
}

export const signUpUser=async(req:Request,res:Response)=>{
    const userDetails:signupDetails=req.body
    if(!userDetails||!userDetails.email||!userDetails.username||!userDetails.name||!userDetails.password){
        return res.status(400).json({
            status:"fail",
            message:"All the fields are required!"
        })
    }
    if(!usernameRegex.test(userDetails.username)){
        return res.status(400).json({
            status:"fail",
            message:"Enter a valid username!"
        })
    }
    if(!emailRgex.test(userDetails.email)){
        return res.status(400).json({
            status:"fail",
            message:"Enter a valid email!"
        })
    }
    if(!passwordRegex.test(userDetails.password)){
        return res.status(400).json({
            status:"fail",
            message:"Enter a valid password!"
        })
    }
    try{
        if(!process.env.JWT_SECRET){
            return res.status(500).json({
                status:"fail",
                message:"JWT_SECRET is not configured!"
            })
        }
        const hash=await bcrypt.hash(userDetails.password,10)
        const userCreated=await prisma.users.create({
            data:{
                username:userDetails.username,
                name:userDetails.name,
                email:userDetails.email,
                password:hash
            }
        })
        const token=jwt.sign(userCreated.user_id,process.env.JWT_SECRET)
        return res.status(201).json({
            status:"success",
            message:`Welcome ${userCreated.username}`,
            token:token,
            data:{
                id:userCreated.user_id,
                username:userCreated.username,
                name:userCreated.name,
                email:userCreated.email
            }
        })
    }catch(error:any){
        if (error.code === "P2002") {
            return res.status(409).json({
                status: "fail",
                message: "Username or email already exists"
            })  
        }
        return res.status(500).json({
            status:"fail",
            message:error instanceof Error? error.message:"Something went wrong!"
        })
    }
}

export const loginUser=async(req:Request,res:Response)=>{
    const userDetails:loginDetails=req.body
    if(!userDetails||!userDetails.credentials||!userDetails.password){
        return res.status(400).json({
            status:"fail",
            message:"login credential or password is missing!"
        })
    }
    try{
        if(!process.env.JWT_SECRET){
            return res.status(500).json({
                status:"fail",
                message:"JWT_SECRET is not configured!"
            })
        }
        const userFound = await prisma.users.findFirst({
            where: {
                OR: [
                    { email: userDetails.credentials },
                    { username: userDetails.credentials }
                ]
            }
        });
        if(!userFound){
            return res.status(400).json({
                status:"fail",
                message:"The user doesn't exist!"
            })
        }
        const isMatching=await bcrypt.compare(userDetails.password,userFound.password)
        if(!isMatching) return res.status(400).json({
            status:"fail",
            message:"Password and login credential doesn't match"
        })
        const token=jwt.sign({user_id:userFound.user_id},process.env.JWT_SECRET)
        return res.status(200).json({
            status:"success",
            message:`Welcome ${userFound.username}`,
            token:token,
            data:{
                id:userFound.user_id,
                username:userFound.username,
                name:userFound.name,
                email:userFound.email
            }
        })
    }catch(error){
        return res.status(500).json({
            status:"fail",
            message:error instanceof Error?error.message:"Something went wrong!"
        })
    }
}