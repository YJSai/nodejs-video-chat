function prittysdp(sdp) {
  var text = 'type:' + sdp.type + '\n';
  text += sdp.sdp;
  return text
}

function prittyice(ice) {
  var text = JSON.stringify(ice, null, "    ");
  return text;
}

var config = {
  media: {
    video: true,
    audio: true
  },
  peer: {
    iceServers: []
  },
  rtcoption: {
    mandatory: {
      OfferToReceiveAudio:true,
      OfferToReceiveVideo:true
    }
  },
  channel: {
    ordered: false,
    maxRetransmitTime: 3000
  }
}

// サーバに接続(localhost)
var socket = io.connect();

var requester = null;
var responser = null;
var localStream = null;

function chat(dataChannel) {
  var $chatView = $('#chatView');
  var $chatInput = $('#chatInput');
  var $chatSubmit = $('#chatSubmit');

  dataChannel.onopen = function () {
    console.log('chat open');
    $chatInput.prop('disabled', false);
  };

  dataChannel.onmessage = function (e) {
    $chatView.val($chatView.val() + e.data + '\n');
    console.log("Got Data Channel Message:", e.data);
  };

  dataChannel.onerror = function (error) {
    $chatInput.prop('disabled', true);
    console.log("Data Channel Error:", error);
  };

  dataChannel.onclose = function () {
    $chatInput.prop('disabled', true);
    console.log("The Data Channel is Closed");
  };

  $chatSubmit.click(function() {
    var message = $chatInput.val();
    dataChannel.send(message);
    $chatView.val($chatView.val() + message + '\n');
  });
}

$(function() {
  var $localVideo = $('#local-video').get(0);
  var $remoteVideo = $('#remote-video').get(0);

  socket.on('offer', function(offer) {
    // create peer responser
    responser = new webkitRTCPeerConnection(config.responser);
    responser.setRemoteDescription(new RTCSessionDescription(offer));

    // add stream
    if(localStream) {
      responser.addStream(localStream);
    }
    responser.onaddstream = function(e) {
      $remoteVideo.src = URL.createObjectURL(e.stream);
    }
    responser.onremovestream = function(e) {
      $remoteVideo.src = '';
    }

    // candidate
    responser.onicecandidate = function(ice) {
      if (ice.candidate) {
        console.log(prittyice(ice.candidate));
        socket.emit('ice', ice.candidate);
      } else {
        console.log('==END CANDIDATE==');
      }
    }

    // answer
    responser.createAnswer(function success(ans) {
      responser.setLocalDescription(ans);

      responser.ondatachannel = function(e) {
        // data channel
        var dataChannel = e.channel;
        chat(dataChannel);

      };
      console.log(prittysdp(ans));
      socket.emit('answer', ans);
    }, console.error, config.rtcoption);
  });

  socket.on('answer', function(sdp) {
    requester.setRemoteDescription(new RTCSessionDescription(sdp));
  });

  socket.on('ice', function(ice) {
    var candidate = new RTCIceCandidate(ice);
    if (requester) {
      requester.addIceCandidate(candidate);
    } else {
      responser.addIceCandidate(candidate);
    }
  });

  socket.on('stop', function() {
    $('#stop').click();
  });

  $('#connect').click(function() {
    // create peer requester
    requester = new webkitRTCPeerConnection(config.requester);

    // data channel
    var dataChannel = requester.createDataChannel('RTCDataChannel', config.channel);
    chat(dataChannel);

    // add stream
    if (localStream) {
      requester.addStream(localStream);
    }
    requester.onaddstream = function(e) {
      $remoteVideo.src = URL.createObjectURL(e.stream);
    }
    requester.onremovestream = function(e) {
      $remoteVideo.src = '';
    }

    // candidate
    requester.onicecandidate = function(ice) {
      if (ice.candidate) {
        console.log(prittyice(ice.candidate));
        socket.emit('ice', ice.candidate);
      } else {
        console.log('==END CANDIDATE==');
      }
    }

    // offer
    requester.createOffer(function success(offer) {
      console.log(prittysdp(offer));
      requester.setLocalDescription(offer);
      socket.emit('offer', offer);
    }, console.error, config.rtcoption);
  });

  // stop
  $('#stop').click(function() {
    $localVideo.src = '';
    $remoteVideo.src = '';
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    socket.disconnect();
    if (requester) {
      requester.close();
      requester = null;
    } else if (responser) {
      responser.close();
      responser = null;
    }
  });

  $('#video').click(function() {
    // start video
    navigator.webkitGetUserMedia(config.media, function success(stream) {
      localStream = stream;
      $localVideo.src = URL.createObjectURL(stream);
      $localVideo.play();
      $localVideo.volume = 0;
    }, console.error);
  });
});

var history_back=[];
var playbackInterruptCommand="";
var signaturePad;

function maininit(){
  handleStatus=true;
  signaturePad = new SignaturePad(canvas);
  playbackInterruptCommand = "";
}

window.onload = function(){
  maininit();
}