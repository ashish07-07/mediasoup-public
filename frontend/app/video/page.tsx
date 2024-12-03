"use client"
import { useEffect, useRef, useState } from "react"
import {io, Socket} from 'socket.io-client'
import { Device } from "mediasoup-client"
import { IceCandidate,DtlsParameters,IceParameters,Transport } from "mediasoup-client/lib/types"

export default function ()
{   
    let rtpcapablitiesref=useRef<any>(null)
    let [cursocket,setsocketre]=useState<Socket| null>(null)
    let cursocketref=useRef<Socket |null>(null);
    let setdeviceref=useRef< Device | null>(null);
    let producertransportref=useRef<Transport |null>(null)
    let consumertransportref=useRef<Transport |null>(null)
    let recipientsocketid=useRef<string|null>(null)
    let callacceptnotibutref=useRef< Boolean| null>(null);
    const [videocall,setvideocall]=useState(false);
    let acceptorreject=useRef<Boolean| null>(null);
    let callref=useRef<Boolean |null>(null);
    let mediaTracksRef = useRef({
      videoTrack: null as MediaStreamTrack | null,
      audioTrack: null as MediaStreamTrack | null,
    });
    let videoref=useRef<HTMLVideoElement | null>(null);
    const [callNotification, setCallNotification] = useState(false);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    // const videoRef = useRef<HTMLVideoElement | null>(null);


    // async function startcamera()
    // {      
    //       try 
    //       {
    //         const stream= await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    //         const videotrack=  stream.getVideoTracks()[0] 
    //         const audiotrack=stream.getAudioTracks()[0]
    //       }

    //       catch (e)
    //       {
    //               console.log(e)
    //       }
          
    // }

    async function initializeMedia() {
      try {
        console.log("ind=side the first function of setting the audio/video")
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    
        if (videoref.current) {
            console.log("inside the video ref dude");
          videoref.current.srcObject = stream;
        }
        const videotrack= stream.getVideoTracks()[0];

    
        mediaTracksRef.current = {
          videoTrack: stream.getVideoTracks()[0],
          audioTrack: stream.getAudioTracks()[0],
        };
    
        console.log("Media tracks initialized:", mediaTracksRef.current);
      } catch (e) {
        console.error("Error initializing media:", e);
      }
    }

    async function createdevice(rtpcapman:any)
    {
               const newdevice= new Device()
               if (!rtpcapman)
               {
                 console.log("the function did not pass the rtp capablities to me to create a device dude");
                     return ;
               }

             await newdevice.load({routerRtpCapabilities:rtpcapman})
             setdeviceref.current=newdevice;
             console.log(`i have set the device in useref now ${setdeviceref.current

             }`)           
    }

  async function createsendtransport(): Promise<void> {
    console.log("Inside the createSendTransport function");

    if (!cursocketref.current) {
        console.log("Socket not yet initialized");
        return;
    }

    try {
        const params = await new Promise<{
            id: string;
            iceParameters: IceParameters;
            iceCandidates: IceCandidate[];
            dtlsParameters: DtlsParameters;
        }>((resolve, reject) => {
            cursocketref.current?.emit(
                "createTransport",
                { sender: true },
                (response: any) => {
                    if (response.error) {
                        console.log("Error from server:", response.error);
                        reject(new Error(response.error));
                    } else if (!response.params) {
                        reject(new Error("Incomplete response from server"));
                    } else {
                        resolve(response.params);
                    }
                }
            );
        });

        if (!setdeviceref.current) {
            console.log(
                "No device found on client side, so no transport can be created to send media"
            );
            return;
        }
        const transport = setdeviceref.current.createSendTransport(params);

        console.log(
            `Client-side send transport created with ID: ${transport.id} and iceGatheringState: ${transport.iceGatheringState}`
        );

        if (!transport) {
            console.log("Failed to create producer transport on client side");
            return;
        }

        producertransportref.current = transport;

       
        transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            console.log("Producer transport is connecting on client side");
            console.log("i much awaited thing i was waiting for is connection dude")

            try {
                if (!cursocketref.current) {
                    console.log(
                        "No current socket available to emit connectProducerTransport event"
                    );
                    return;
                }

                cursocketref.current.emit("connectProducerTransport", {
                    dtlsParameters,
                });
                callback();
            } catch (error) {
                console.error("Error during producer transport connect:", error);
                errback(error);
            }
        });

        transport.on("icegatheringstatechange", () => {
          console.log(`ICE Gathering State Changed: ${transport.iceGatheringState}`);
          if (transport.iceGatheringState === 'complete') {
              // Proceed with connecting the transport
              console.log("ICE gathering complete, now can connect transport");
          }
      });


        transport.on("produce", async (parameters, callback, errback) => {
            console.log("Inside the transport produce method on the client side");

            try {
                if (!cursocketref.current) {
                    console.log("No current socket available to emit produce event");
                    return;
                }

                const { kind, rtpParameters } = parameters;
                if (!kind || !rtpParameters) {
                    console.error(
                        "Missing kind or RTP parameters while producing"
                    );
                    return;
                }

                cursocketref.current.emit(
                    "transport-produce",
                    { kind, rtpParameters },
                    ({ id }: { id: string }) => {
                        callback({ id }); 
                    }
                );
            } catch (error) {
                console.error("Error during transport produce:", error);
                errback(error);
            }
        });
    } catch (error) {
        console.error("Error in createSendTransport:", error);
    }
}

async function createRecvTransport(): Promise<void> {
    console.log("Inside the createSendTransport function");

    if (!cursocketref.current) 
    {
        console.log("Socket not yet initialized");
        return;
    }

    try {
       
        const params = await new Promise<{
            id: string;
            iceParameters: IceParameters;
            iceCandidates: IceCandidate[];
            dtlsParameters: DtlsParameters;
        }>((resolve, reject) => {
            cursocketref.current?.emit(
                "createTransport",
                { sender: false },
                (response: any) => {
                    if (response.error) {
                        console.log("Error from server:", response.error);
                        reject(new Error(response.error));
                    } else if (!response.params) {
                        reject(new Error("Incomplete response from server"));
                    } else {
                        resolve(response.params);
                    }
                }
            );
        });

        if (!setdeviceref.current) {
            console.log(
                "No device found on client side, so no transport can be created  to revieve media"
            );
            return;
        }

      
        const transport = setdeviceref.current.createRecvTransport(params);

        console.log(
            `Client-side consume- transport created with ID: ${transport.id} and iceGatheringState: ${transport.iceGatheringState}`
        );

        if (!transport) {
            console.log("Failed to create consumer  transport on client side");
            return;
        }

       consumertransportref.current=transport;

       
        transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
            console.log("consumer  transport is connecting on client side");
            console.log("INSIDE THE CONSUMER TRANSPORT CONNECTION STATE AS THIS GOT TRIGGERD BECASUE OF CONSUMER CREATION ON CLIENT SIDE ")

            try {
                if (!cursocketref.current) {
                    console.log(
                        "No current socket available to emit connectconsumerTransport event"
                    );
                    return;
                }

                cursocketref.current.emit("connectConsumerTransport", {
                    dtlsParameters,

                });
                callback();
            } catch (error) {
                console.error("Error during producer transport connect:", error);
                errback(error);
            }
        });
    } catch (error) {
        console.error("Error in createSendTransport:", error);
    }
}



async function makenotification()
{
       if (!producertransportref.current && !consumertransportref.current)
       {
             console.log("no transport is only present what will u call");
             return ;
       } 

       if (!cursocketref.current)
       {
            console.log("no current socket ref what will i call");
            return ;
       }

       if (!recipientsocketid.current)
       {
           console.log("no reciepiect socket id");
           return ;
       }
       console.log("i am inside the makenotification function to call");


       cursocketref.current.emit("callman",
        {
          socketid:recipientsocketid.current
        }
       )
}

async function Acceptcall()
{
        if (!cursocketref.current)
        {
          console.log("no current socket");
          return ;
        }
        

        cursocketref.current.emit("acceptedcall")
        console.log("next iw ill call the connect reciever transport dude");

}


async function produceTracks() {
  const { videoTrack, audioTrack } = mediaTracksRef.current;
    //  const {videoTrack}=mediaTracksRef.current
  if (videoTrack) {
    const videoProducer = await producertransportref.current?.produce({ track: videoTrack });
    console.log("Video producer created:", videoProducer);
  }

  if (audioTrack) {
    const audioProducer = await producertransportref.current?.produce({ track: audioTrack });
    console.log("Audio producer created:", audioProducer);
  }
}




const connectSendTransport = async () => {

  let localProducer = await producertransportref.current?.produce();

  localProducer?.on("trackended", () => {
    console.log("trackended");
  });
  localProducer?.on("transportclose", () => {
    console.log("transportclose");
  });
};

const connectRecvTransport = async () => {
   

    console.log("i am inside the connectreciever transport which will emit the consumemedia event to server ")
    if (!cursocketref.current)
    {
        console.log("no current socket is present to emit dude");
         return 
    }
    await cursocketref.current.emit(
      "consumeMedia",
      { rtpCapabilities: setdeviceref.current?.rtpCapabilities },
      async ({ params }: any) => {
        if (params.error) {
          console.log(params.error);
          return;
        }

        let consumer = await consumertransportref.current?.consume({
            id: params.id,
            producerId: params.producerId,
            kind: params.kind,
            rtpParameters: params.rtpParameters,
          });
          
          if (!consumer) {
            console.log("Oh no! No client consumer was created.");
            return;
          }
          
          const track = consumer.track;
          console.log("Received consumer track:", track);
          console.log(consumer.track);

          const mediastream= new MediaStream();
          mediastream.addTrack(track);

          const videoElement = document.getElementById("videoElement") as HTMLVideoElement;

          if (!videoElement)
          {
              console.error("video element not found in DOM");
              return;
          }
          
          if (remoteVideoRef.current)
          {
               remoteVideoRef.current.srcObject= new MediaStream([track])
          }
          
          videoElement.srcObject= mediastream;
        //   videoElement.play();
        videoElement.onloadedmetadata = () => {
            videoElement.play()
              .then(() => {
                console.log("Playback started successfully.");
              })
              .catch((error) => {
                console.error("Error starting playback:", error);
              });
          };
          cursocketref.current?.emit("resumePausedConsumer", () => {
            console.log("Consumer transport has resumed.");
          });
          
      }
    );
  };



       useEffect(()=>
    { 
          
        async function Initialize ()
        {
            const socket= io("http://localhost:3000/mediasoup");
            setsocketre(socket);
            cursocketref.current=socket;

            console.log(`my socket id is ${socket.id}`)


            
            await initializeMedia();

            socket.emit("getrtpcapablities", 
                {
                    socketid:socket.id
                }
            )

            
            socket.on("newUserConnected", function ({socketid})
          {

              console.log("i am inside the event where i am setting the recipient socket id ");
              if (!socketid)
              {
                 console.log(`no recipient socket socket id is present here`);
                  return ;
                 
              }

              recipientsocketid.current=socketid;
                
          })

          socket.on("takertpparameters",async function ({rtpcapablitiess})

             
        {   
            console.log("inside the client part now after server has sent the rtpcapablities")
            
            
                  if (!rtpcapablitiess)
                  {
                    console.log("no rtp capablities from server ")
                     return ;
                  }
                
                rtpcapablitiesref.current=rtpcapablitiess;

                console.log(`now i have got the rtp capablities from the server back and it has the details of ${JSON.stringify(rtpcapablitiesref.current)} dude`)

                await createdevice(rtpcapablitiess)
                console.log("i have called the create device function");
                await createsendtransport();
                console.log("i ahve called the create producer-transport function")
                await createRecvTransport()
                console.log(`i have called the consumer- transport dude`);    
        })

        socket.on("toclientcallnoti", function ()


      {   
              console.log("i am inside the  toclientcallnoti where i will set the call ref if its true u will see abutton to acdept it dude this should happen in recievrsb broswser")
             callref.current=true;
             setCallNotification(true);
             
      })

      socket.on("success", async function ()
    {
            //  await connectSendTransport()
            await produceTracks()
    })

    socket.on("producer-ready", async function ()
{         
         console.log("now i will call teh connect  reciever transport dude");
         await connectRecvTransport();

})

        }


        Initialize()
         
        },[]) 

      

 return <div>

Hello bro

 <video ref={remoteVideoRef} id="remotevideo" autoPlay playsInline  muted={false}  style={{ width: "100%", height: "auto" }} /> 
<video ref={videoref} id="localvideo" autoPlay playsInline />
<video id="videoElement" autoPlay playsInline muted></video>

<button onClick={makenotification} className="text-zinc-50">Make a call notification</button>
{callref.current &&(

  <button onClick={Acceptcall}>Accept call</button>
)}

{callNotification && (
                <button onClick={Acceptcall}>Accept call</button>
            )}

 </div>
}



