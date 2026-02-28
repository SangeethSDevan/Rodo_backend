import express from "express"
import { getDirection } from "../Controllers/directionController.js"
import { predictQuality } from "../Controllers/qualityController.js"

const directionRouter=express.Router()

directionRouter.get("/",getDirection)
    .post("/",predictQuality)

export default directionRouter