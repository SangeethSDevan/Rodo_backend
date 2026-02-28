import axios from "axios"
import "dotenv/config"
import polyline from "@mapbox/polyline"
import geohash from "ngeohash"
import type { Request, Response } from "express";
import { prisma } from "../utils/prisma.js";

type DBRow={
    geohash:string,
    roadQuality:number
}

const GOOGLE_MAP_API_KEY=process.env.GOOG_MAP_API_KEY;

export const getDirection=async(req:Request,res:Response)=>{
    const {src,dest}=req.query
    if(!src||!dest){
        return res.status(400).json({
            status:"fail",
            message:"Source and destination not found!"
        })
    }

    try{
        const response=await axios.get(
            `https://maps.googleapis.com/maps/api/directions/json`,
            {
                params:{
                    origin:src,
                    destination:dest,
                    alternatives:true,
                    key:GOOGLE_MAP_API_KEY
                }
            }
        )
        const scoredRoutes:any[]=[]
        const routes=response.data.routes
        for(const route of routes){
            const polylineStr=route.overview_polyline.points;

            const sampledPoints=samplePoints(polylineStr,10)
            if(!sampledPoints) continue

            const geohash=convertPointsToGeoHash(sampledPoints!)
            const dbRows=await queryDB(geohash)

            const {score,coverage,avgQuality}=scoreRoute(geohash,dbRows);
            scoredRoutes.push({
                polylineStr,
                route,
                score,
                coverage,
                avgQuality
            })
        }

        scoredRoutes.sort((a,b)=>b.score-a.score)
        const bestRoute=scoredRoutes[0]
        const encodedPolyline=bestRoute.route.overview_polyline.points;

        const routeCoordinates=encodePolyline(encodedPolyline)

        return res.status(200).json({
            status:"success",
            message:"Directions fetched successfully!",
            points:routeCoordinates,
            destination:routes[0].legs[0].end_location,
            polyline:bestRoute.polylineStr,
            analytics:{
                score:bestRoute.score,
                avgQuality:bestRoute.avgQuality,
                coverage:bestRoute.coverage
            }
        })
    }catch(error){
        return res.status(500).json({
            status:"fail",
            message:error instanceof Error?error.message:"Something went wrong!"
        })
    }
}

const scoreRoute=(routeGeoHash:string[],dbRows:DBRow[])=>{
    const map=new Map(
        dbRows.map(r=>[r.geohash,r.roadQuality])
    )

    let known=0;
    let qualitySum=0

    for(const hash of routeGeoHash){
        const quality=map.get(hash);
        if(quality!==undefined){
            known++;
            qualitySum+=quality
        }else{
            qualitySum+=0.6
        }
    }
    const coverage=known/routeGeoHash.length
    const avgQuality=qualitySum/routeGeoHash.length

    const score=avgQuality*0.7+coverage*0.3

    return {score,coverage,avgQuality}
}

const samplePoints=(points:string,stepMeters:number)=>{
    const decoded=polyline.decode(points);
    const sampled:{lat:number,lon:number}[]=[];

    let first=decoded[0]
    if(!first) return;
    sampled.push({lat:first[0],lon:first[1]})

    let acc=0;
    for(let i=0;i<decoded.length;i++){
        let current=decoded[i]!;
        const distance=haversineDistance(first[0],first[1],current[0],current[1])

        acc+=distance
        if(acc>=stepMeters){
            sampled.push({lat:current[0],lon:current[1]})
            acc=0;
            first=current;
        }
    }
    return sampled;
}

const convertPointsToGeoHash=(
    points:{lat:number,lon:number}[]
):string[]=>{
    return [...new Set(
        points.map(p=>geohash.encode(p.lat,p.lon,8))
    )]
}

const queryDB=async(geohashes:string[])=>{
    const result=await prisma.roadQuality.findMany({
        where:{
            geohash:{
                in:geohashes
            }
        }
    })
    return result
}

const haversineDistance=(
    lat1:number,lon1:number,
    lat2:number,lon2:number
):number=>{
    const R=6371000;
    const toRad=(x:number)=>(x*Math.PI)/180;

    const dLat=toRad(lat1-lat2)
    const dLon=toRad(lon1-lon2)

    const a=Math.sin(dLat/2)**2
        +Math.cos(toRad(lat1))
        *Math.cos(toRad(lat2))
        *Math.sin(dLon/2)**2

    return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

const encodePolyline=(encodedPolyline:string)=>{
    const decoded=polyline.decode(encodedPolyline)

    return decoded.map(p=>({
        lat:p[0],
        lon:p[1]
    }))
}

const extractWayPoints=(
    points:{lat:number,lon:number}[],
    numberOfWaypoints:number
)=>{
    if(points.length===0) return [];

    const step=Math.floor(points.length/numberOfWaypoints)
    const waypoints=[]
    for(let i=step;i<points.length-step;i+=step){
        waypoints.push(points[i])
    }

    waypoints.push(points[points.length-1])

    return waypoints
}