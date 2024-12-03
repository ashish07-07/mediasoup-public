"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mediasoup_1 = require("mediasoup");
const mediasoup_2 = __importDefault(require("mediasoup"));
const express_1 = __importDefault(require("express"));
let worker;
let routerr;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
let producerTransport;
let consumerTransport;
let producer;
let consumer;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        credentials: true
    }
});
function initialize() {
    return __awaiter(this, void 0, void 0, function* () {
        worker = yield (0, mediasoup_1.createWorker)();
        console.log(`inside the initialize function and workwer i got it ${JSON.stringify(worker)}`);
    });
}
initialize().catch((error) => {
    console.error("Error initializing worker:", error);
});
const peers = io.of("/mediasoup");
let socketarray = [];
function createworker() {
    return __awaiter(this, void 0, void 0, function* () {
        const newworker = yield mediasoup_2.default.createWorker({
            rtcMaxPort: 2000,
            rtcMinPort: 2020
        });
        console.log(`conngrajulation new worker is created and its ddetials is ${JSON.stringify(newworker)}`);
        newworker.on("died", function (error) {
            console.log("mediasoup woreker died");
            setTimeout(() => {
                process.exit();
            }, 20000);
        });
        return newworker;
    });
}
const mediaCodecs = [
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
peers.on("connection", function (socket) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`A New client connected to me with socketid of ${socket.id}`);
        console.log(`my socket id dude ${socket.id}`);
        socketarray.push(socket.id);
        socket.broadcast.emit("newUserConnected", {
            socketid: socket.id
        });
        if (!worker) {
            console.log('worker is not created so i need to return ');
            return;
        }
        routerr = yield worker.createRouter({
            mediaCodecs: mediaCodecs
        });
        console.log(`are boss i have the router now and its rtp capablities is  ${JSON.stringify(routerr.rtpCapabilities)}`);
        socket.on("getrtpcapablities", function (_a) {
            return __awaiter(this, arguments, void 0, function* ({ socketid }) {
                console.log("client sent me this event to get the rtp capablities");
                if (!routerr) {
                    console.log("no router created as of now so i should return");
                    return;
                }
                console.log(`the socket id is ${socketid}`);
                const rtpcapablitiess = routerr.rtpCapabilities;
                peers.to(socketid).emit("takertpparameters", {
                    rtpcapablitiess
                });
            });
        });
        socket.on("createTransport", (_a, callback_1) => __awaiter(this, [_a, callback_1], void 0, function* ({ sender }, callback) {
            console.log("i am inside the create transport socket emit which the client did ");
            if (sender) {
                producerTransport = yield createWebRtcTransport(callback);
            }
            else {
                consumerTransport = yield createWebRtcTransport(callback);
            }
        }));
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
        socket.on("callman", function () {
            return __awaiter(this, void 0, void 0, function* () {
                console.log(`the client sent to me (server) to send it  to another client`);
                //  if (!socketid)
                //  {
                //       console.log("no socketid dude where will i forward it") ;
                //       return ;
                //  }
                //  console.log(`the socket to whocm i will send the event of to client not is ${socketid}`)
                peers.to(socketarray[1]).emit("toclientcallnoti", {
                    caller: true
                });
            });
        });
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
        socket.on("acceptedcall", function () {
            return __awaiter(this, void 0, void 0, function* () {
                // if(!socketid)
                // {
                //   console.log("no socket id to wom wiil i send");
                //   return ;
                // }
                peers.to(socketarray[0]).emit("success", {
                    call: true
                });
            });
        });
        socket.on("connectProducerTransport", (_b) => __awaiter(this, [_b], void 0, function* ({ dtlsParameters }) {
            if (!dtlsParameters) {
                console.log("no dtls parameter is present to connect");
                return;
            }
            //  await producerTransport?.connect({dtlsParameters:dtsParameters})
            yield (producerTransport === null || producerTransport === void 0 ? void 0 : producerTransport.connect({ dtlsParameters: dtlsParameters }));
            console.log('GOD NOW THE PRODUCER TRANSPORT IS CONNECTED IN THE SERVER SIDE DUDE');
            console.log("gogod now i have now connected dude");
            console.log(`producer transport connect state is ${JSON.stringify(producerTransport === null || producerTransport === void 0 ? void 0 : producerTransport.iceState)}is ice state ${JSON.stringify(producerTransport === null || producerTransport === void 0 ? void 0 : producerTransport.iceState)}`);
            console.log(`tranport now is ${JSON.stringify(producerTransport)}`);
        }));
        socket.on("transport-produce", function (_a, callback_2) {
            return __awaiter(this, arguments, void 0, function* ({ kind, rtpParameters }, callback) {
                console.log(" INSIDE SERVER PRODUCE CODE (TRANSPORT PRODUCE) ERFFECT");
                console.log("i am inside the transport-produce event in server which got triggered because of producetranpsot.produce i client side");
                producer = yield (producerTransport === null || producerTransport === void 0 ? void 0 : producerTransport.produce({
                    kind,
                    rtpParameters
                }));
                console.log(`i have created a producer in server side and its producer details kind is ${JSON.stringify(producer === null || producer === void 0 ? void 0 : producer.kind)} ${JSON.stringify(producer === null || producer === void 0 ? void 0 : producer.rtpParameters)} and {}}`);
                console.log(`are the kind which the CLIENT SENT ME WAS +++++++++++++++++********************${JSON.stringify(producer === null || producer === void 0 ? void 0 : producer.kind)}`);
                producer === null || producer === void 0 ? void 0 : producer.on("transportclose", () => {
                    console.log("Producer transport closed");
                    producer === null || producer === void 0 ? void 0 : producer.close();
                });
                callback({ id: producer === null || producer === void 0 ? void 0 : producer.id });
                peers.to(socketarray[1]).emit("producer-ready", {
                    producerid: producer === null || producer === void 0 ? void 0 : producer.id
                });
            });
        });
        socket.on("connectConsumerTransport", (_c) => __awaiter(this, [_c], void 0, function* ({ dtlsParameters }) {
            console.log("i am inside the server code where i am connecting the consumertransport ");
            yield (consumerTransport === null || consumerTransport === void 0 ? void 0 : consumerTransport.connect({ dtlsParameters }));
            console.log(`i think the connection of consumer transport is finished i guess and the consumer now is ${JSON.stringify(consumer)}`);
        }));
        socket.on("consumeMedia", (_d, callback_2) => __awaiter(this, [_d, callback_2], void 0, function* ({ rtpCapabilities }, callback) {
            console.log("************************************************");
            console.log("IMP IMP");
            try {
                if (producer) {
                    if (!routerr.canConsume({ producerId: producer === null || producer === void 0 ? void 0 : producer.id, rtpCapabilities })) {
                        console.log("are this client cannot consume this medai because the rtpcapablitiews is not matching");
                        return;
                    }
                    console.log("good the client can consume");
                    consumer = yield (consumerTransport === null || consumerTransport === void 0 ? void 0 : consumerTransport.consume({
                        producerId: producer === null || producer === void 0 ? void 0 : producer.id,
                        rtpCapabilities,
                        paused: (producer === null || producer === void 0 ? void 0 : producer.kind) === 'video'
                    }));
                    yield (consumer === null || consumer === void 0 ? void 0 : consumer.resume());
                    console.log(` GOOD NEWS DUDE I HAVE SUCCESSFULLY CREATED THE CONSUMER IN SERVER SIDE DUDE `);
                    consumer === null || consumer === void 0 ? void 0 : consumer.on("transportclose", () => {
                        console.log("consumer transport closed");
                    });
                    consumer === null || consumer === void 0 ? void 0 : consumer.on("producerclose", () => {
                        console.log("Producer closed");
                        consumer === null || consumer === void 0 ? void 0 : consumer.close();
                    });
                    callback({
                        params: {
                            producerId: producer === null || producer === void 0 ? void 0 : producer.id,
                            id: consumer === null || consumer === void 0 ? void 0 : consumer.id,
                            kind: consumer === null || consumer === void 0 ? void 0 : consumer.kind,
                            rtpParameters: consumer === null || consumer === void 0 ? void 0 : consumer.rtpParameters,
                        }
                    });
                }
                else {
                    console.log("NO PRODUCER IS CREATED YET SO NO CANNOT CREATE OCNSUMER ********");
                }
            }
            catch (error) {
                console.error("Error consuming:", error);
                console.log(error);
                callback({
                    params: {
                        error,
                    },
                });
            }
        }));
        socket.on("resumePausedConsumer", () => __awaiter(this, void 0, void 0, function* () {
            console.log("consume-resume");
            yield (consumer === null || consumer === void 0 ? void 0 : consumer.resume());
        }));
    });
});
const createWebRtcTransport = (callback) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log(` i am inside the create webrtc transport function inside the server`);
        const webRtcTransportOptions = {
            listenIps: [
                {
                    ip: "0.0.0.0",
                    // announcedIp:"127.0.0.1",
                    announcedIp: "103.89.235.238"
                },
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        };
        const transport = yield routerr.createWebRtcTransport(webRtcTransportOptions);
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
    }
    catch (error) {
        console.log(error);
        callback({
            params: {
                error,
            },
        });
    }
});
server.listen(3000, function () {
    console.log(`server listening on port 3000`);
});
