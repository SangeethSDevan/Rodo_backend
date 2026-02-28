import express from "express"
import directionRouter from "./Routers/directionRouter.js"
import userRouter from "./Routers/userRouter.js"

const app=express()

app.use(express.json())

app.use("/api/v1/maps",directionRouter)
app.use("/api/v1/users",userRouter)

app.get("/health",(req,res)=>{
    return res.status(200).json({
        status:"success",
        message:"I'm alive!"
    })
})

export default app