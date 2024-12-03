
import http, { createServer } from 'http'
import {Server} from 'socket.io'
import {createWorker} from 'mediasoup'
import mediasoup from 'mediasoup'
import express from 'express'
import { IceParameters } from 'mediasoup-client/lib/types';
import { IceCandidate } from 'mediasoup-client/lib/types';
let worker: mediasoup.types.Worker<mediasoup.types.AppData>;
let routerr:mediasoup.types.Router<mediasoup.types.AppData>;
const app=express();

const server = http.createServer(app);

let producerTransport:
  | mediasoup.types.WebRtcTransport<mediasoup.types.AppData>
  | undefined;

let consumerTransport:
  | mediasoup.types.WebRtcTransport<mediasoup.types.AppData>
  | undefined;

  let producer: mediasoup.types.Producer<mediasoup.types.AppData> | undefined;

  let consumer: mediasoup.types.Consumer<mediasoup.types.AppData> | undefined;
const io=new Server(server,{

    cors:
    {
         origin:"*",
         credentials:true
    }
})


async function initialize()
{
    worker= await createWorker()
    console.log(`inside the initialize function and workwer i got it ${JSON.stringify(worker)}`)
}

initialize().catch((error)=>
{
      console.error("Error initializing worker:",error);

})


const peers= io.of("/mediasoup");

let socketarray= [];

async function createworker():Promise<mediasoup.types.Worker<mediasoup.types.AppData>>
{
           const newworker= await mediasoup.createWorker(
            {
                rtcMaxPort:2000,
                rtcMinPort:2020
            }
           )

           console.log(`conngrajulation new worker is created and its ddetials is ${JSON.stringify(newworker)}`);

           newworker.on("died", function(error)
        {
              console.log("mediasoup woreker died");
              setTimeout(() => {
                process.exit();
              }, 20000);
        })

        return newworker;
}
const mediaCodecs: mediasoup.types.RtpCodecCapability[] = [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
      preferredPayloadType: 96,
      rtcpFeedback: [{ type: "nack" }, { type: "nack", parameter: "pli" }],
    },
    {
        kind: "video",
        mimeType: "video/H264",
        clockRate: 90000,
        parameters: { "level-asymmetry-allowed": 1, "packetization-mode": 1 },
        preferredPayloadType: 102,
        rtcpFeedback: [
          { type: "nack" },
          { type: "ccm", parameter: "fir" },
          { type: "goog-remb" },
        ],
      }
      
  ];


  peers.on("connection",async function (socket)
{
     console.log(`A New client connected to me with socketid of ${socket.id}`);

     console.log(`my socket id dude ${socket.id}`)
     
     socketarray.push(socket.id);

    

     socket.broadcast.emit("newUserConnected",
      {
        socketid:socket.id
      }
     )



     if (!worker)
     {
        console.log('worker is not created so i need to return ');
        return ;
     }
     routerr= await worker.createRouter(
        {
            mediaCodecs:mediaCodecs
        }
     )

     console.log(`are boss i have the router now and its rtp capablities is  ${JSON.stringify(routerr.rtpCapabilities)}`);

     

     socket.on("getrtpcapablities", async function ({socketid})
    {
        console.log("client sent me this event to get the rtp capablities")
              if (!routerr)
              {
                console.log("no router created as of now so i should return");
                return ;
              }

              console.log(`the socket id is ${socketid}`)

              const rtpcapablitiess= routerr.rtpCapabilities;

              peers.to(socketid).emit("takertpparameters", 
                {
                     rtpcapablitiess
                }
              )
    })

    socket.on("createTransport", async ({sender}, callback)=>
    {   
        console.log("i am inside the create transport socket emit which the client did ")
          if (sender)
          {
                producerTransport= await createWebRtcTransport(callback)
          }
          else 
          {
                consumerTransport= await createWebRtcTransport(callback)
          }
    })


//   socket.on("callman", async function ({socketid})
// {

//   console.log(`the client sent to me (server) to send it  to another client`);
//        if (!socketid)
//        {
//             console.log("no socketid dude where will i forward it") ;
//             return ;
 
//        }

//        console.log(`the socket to whocm i will send the event of to client not is ${socketid}`)

//        peers.to(socketid).emit("toclientcallnoti",
//         {
//           caller:true
//         }
//        )
// })

socket.on("callman", async function ()
{

  console.log(`the client sent to me (server) to send it  to another client`);
      //  if (!socketid)
      //  {
      //       console.log("no socketid dude where will i forward it") ;
      //       return ;
 
      //  }

      //  console.log(`the socket to whocm i will send the event of to client not is ${socketid}`)

       peers.to(socketarray[1]).emit("toclientcallnoti",
        {
          caller:true
        }
       )
})

// socket.on("acceptedcall", async function ({socketid})
// {
//       if(!socketid)
//       {
//         console.log("no socket id to wom wiil i send");
//         return ;
//       }

//       peers.to(socketid).emit("success",
//         {
//           call:true
//         }
//       )
// })

socket.on("acceptedcall", async function ()
{
      // if(!socketid)
      // {
      //   console.log("no socket id to wom wiil i send");
      //   return ;
      // }

      peers.to(socketarray[0]).emit("success",
        {
          call:true
        }
      )
})

socket.on("connectProducerTransport", async ({ dtlsParameters})=>
{
       if (!dtlsParameters)
       {
        console.log("no dtls parameter is present to connect");
        return ;
       }
      //  await producerTransport?.connect({dtlsParameters:dtsParameters})
       await producerTransport?.connect({dtlsParameters:dtlsParameters})
       console.log('GOD NOW THE PRODUCER TRANSPORT IS CONNECTED IN THE SERVER SIDE DUDE')
       console.log("gogod now i have now connected dude");
       console.log(`producer transport connect state is ${JSON.stringify(producerTransport?.iceState)}is ice state ${JSON.stringify(producerTransport?.iceState)}`);
       console.log(`tranport now is ${JSON.stringify(producerTransport)}`)
})

socket.on("transport-produce", async function ({kind,rtpParameters},callback)
{   console.log(" INSIDE SERVER PRODUCE CODE (TRANSPORT PRODUCE) ERFFECT")
   console.log("i am inside the transport-produce event in server which got triggered because of producetranpsot.produce i client side");

    producer= await producerTransport?.produce({
      kind,
      rtpParameters
    })

    console.log(`i have created a producer in server side and its producer details kind is ${JSON.stringify(producer?.kind)} ${JSON.stringify(producer?.rtpParameters)} and {}}`)

    console.log(`are the kind which the CLIENT SENT ME WAS +++++++++++++++++********************${JSON.stringify(producer?.kind)}`)




     producer?.on("transportclose", () => {
      console.log("Producer transport closed");
      producer?.close();
    });

    callback({ id: producer?.id });

    peers.to(socketarray[1]).emit("producer-ready", 
      {
        producerid:producer?.id
      }
    )
   
})


socket.on("connectConsumerTransport", async ({ dtlsParameters }) => {
  console.log("i am inside the server code where i am connecting the consumertransport ")

  await consumerTransport?.connect({ dtlsParameters });
  console.log(`i think the connection of consumer transport is finished i guess and the consumer now is ${JSON.stringify(consumer)}`)
});


socket.on("consumeMedia", async ({rtpCapabilities},callback)=>
{
  console.log("************************************************")
  console.log("IMP IMP")
       try 
       {
                if (producer)
                {
                     if (!routerr.canConsume({producerId:producer?.id,rtpCapabilities}))
                     {
                       console.log("are this client cannot consume this medai because the rtpcapablitiews is not matching");
                       return ;
                     }

                    console.log("good the client can consume");

                    consumer=await consumerTransport?.consume({
                      producerId:producer?.id,
                      rtpCapabilities,
                      paused:producer?.kind==='video'
                      
                    })

                    await consumer?.resume();

                    console.log(` GOOD NEWS DUDE I HAVE SUCCESSFULLY CREATED THE CONSUMER IN SERVER SIDE DUDE `)

                    consumer?.on("transportclose", ()=>{
                        
                      console.log("consumer transport closed")

                    })

                    consumer?.on("producerclose", () => {
                      console.log("Producer closed");
                      consumer?.close();
                    });

                    callback({


                      params:
                      {
                        producerId: producer?.id,
                        id: consumer?.id,
                        kind: consumer?.kind,
                        rtpParameters: consumer?.rtpParameters,


                      }
                    })

                    


                }

                else
                {
                    console.log("NO PRODUCER IS CREATED YET SO NO CANNOT CREATE OCNSUMER ********")
                }
       }

       catch (error)
       {     console.error("Error consuming:", error);
             console.log(error);

             callback({
              params: {
                error,
              },
            });
       }
})


socket.on("resumePausedConsumer", async () => {
  console.log("consume-resume");
  await consumer?.resume();
});



})


const createWebRtcTransport = async (
    callback: (arg0: {
      params:
        | {
            id: string;
            iceParameters: mediasoup.types.IceParameters;
            iceCandidates: mediasoup.types.IceCandidate[];
            dtlsParameters: mediasoup.types.DtlsParameters;
          }
        | {
            error: unknown;
          };
    }) => void
  ) => {
    try {

      console.log(` i am inside the create webrtc transport function inside the server`)
      const webRtcTransportOptions = {
        listenIps: [
          {
            ip: "0.0.0.0",
            // announcedIp:"127.0.0.1",
            announcedIp:"103.89.235.238"
            
          },
        ],
        
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
      };
  
      const transport = await routerr.createWebRtcTransport(webRtcTransportOptions);
  
      console.log(`Transport created: ${transport.id}`);
  
      transport.on("dtlsstatechange", (dtlsState) => {
        if (dtlsState === "closed") {
          transport.close();
        }
      });
  
      transport.on("@close", () => {
        console.log("Transport closed");
      });
  
      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      });
  
      return transport;
    } catch (error) {
      console.log(error);
      callback({
        params: {
          error,
        },
      });
    }
  };
  


server.listen(3000, function ()
{
    console.log(`server listening on port 3000`);
})