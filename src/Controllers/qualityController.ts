import type { Request, Response } from "express";
import { RandomForestRegression } from "ml-random-forest";
import { prisma } from "../utils/prisma.js";
import csv from "csvtojson"

let model: RandomForestRegression | null = null;
trainModel();

async function trainModel(){
    console.log('Reading Dataset!')
    const rows = await csv().fromFile("data/road_dataset.csv")

    const X:number[][] = [];
    const Y:number[] = []

    rows.forEach((row:any)=>{
        const rms = Number(row.rms_value);
        const peaks = Number(row.peak_count);
        const quality = Number(row.roadQuality);

        if (isNaN(rms) || isNaN(peaks) || isNaN(quality)) return;

        X.push([rms, peaks])
        Y.push(quality)
    })

    if (X.length === 0) {
        throw new Error("Dataset empty! Check CSV headers.");
    }

    console.log('Training Model!')
    model = new RandomForestRegression({
        seed:42,
        maxFeatures:1.0,
        replacement:true,
        nEstimators:100
    })

    model.train(X,Y);
    console.log("Model trained!")
}

export const predictQuality = async (req:Request,res:Response)=>{
    const {rms_value,peak_count,geohash} = req.body

    console.log(req.body)

    if (rms_value == null || peak_count == null || geohash == null) {
    return res.status(400).json({
        status: "fail",
        message: "Road values not found!"
    });
}

    if(!model){
        return res.status(503).json({
            status:"fail",
            message:"Model still training. Try again."
        })
    }

    const rms = Number(rms_value);
    const peaks = Number(peak_count);

    if(isNaN(rms) || isNaN(peaks)){
        return res.status(400).json({
            status:"fail",
            message:"Invalid RMS or peak values"
        })
    }

    const prediction = model.predict([[rms, peaks]])[0]

    const score = Number.isFinite(prediction)
        ? Math.max(0,Math.min(1,prediction!))
        : 0.5;
    try{
        const existing=await prisma.roadQuality.findUnique({
            where:{
                geohash:geohash
            }
        })
        if(!existing){
            await prisma.roadQuality.create({
                data:{
                    geohash:geohash,
                    roadQuality:score,
                    sample:1
                }
            })
        }else{
            const newSample=existing.sample+1;
            const newAverage=((existing.roadQuality*existing.sample)+score)/newSample
            await prisma.roadQuality.update({
                where:{
                    geohash:geohash
                },
                data:{
                    roadQuality:newAverage,
                    sample:newSample
                }
            })
        }

        return res.status(200).json({
            status:"success",
            message:"Road quality added!",
            score:score
        })

    }catch(error){
        return res.status(500).json({
            status:"fail",
            message:error instanceof Error? error.message:"Something went wrong!"
        })
    }
}
