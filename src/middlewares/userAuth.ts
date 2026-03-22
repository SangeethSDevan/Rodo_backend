import type { NextFunction, Request, Response } from "express";
import "dotenv/config"
import jwt from "jsonwebtoken"

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export function userAuth(req:Request,res:Response,next:NextFunction){
    const token=req.headers['authorization']?.split(" ")[1]
    if(!token){
        return res.status(403).json({
            status:"fail",
            message:"Token not found!"
        })
    }
    try{
        const payload=jwt.verify(token,process.env.JWT_SECRET!)
        req.user=payload
        next()
    }catch(error){
        return res.status(401).json({
            status:"fail",
            message:"Invalid token!"
        })
    }
}