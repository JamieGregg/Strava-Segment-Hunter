$(document).ready(function() {
  $("#confirmation-box").hide();
  $("#submitButton").hide();
  $("#segmentInvalid").hide();
  $("#loader").hide();

  $("#continue").click(function() {
    let clubData = {
      segmentId: $('#stravaSeg').val()
    }
    $.ajax({
      type: 'POST',
      url: '/validateSegment',
      dataType: 'json',
      data: clubData,
      beforeSend: function() {
        $("#loader").show();
      },
      success: function(info) {
        if (info.statusCode === 404) {
          $("#segmentInvalid").show();
          $("#segmentInvalid").html("Strava does not regonise this segment");
        } else if(info.statusCode === 401){
          $("#segmentInvalid").show();
          $("#segmentInvalid").html("Strava timed out, try resubmitting");
        } else {
          $('#stravaSeg').attr("disabled", "disabled");
          $("#segmentInvalid").hide();
          $("#confirmation-box").show();
          $("#confirmStravaSeg").attr("placeholder", info.segmentName)
          $("#submitButton-box").show();
          $("#continueButton").hide();
          $("#submitButton").show();
        }
      },
      complete: function(data) {
        $("#loader").hide();
      }
    })
  })


  $("#submit").click(function() {
    $("#stravaSeg").removeAttr("disabled")
    $("#continueButton").show();
    $("#confirmation-box").hide();
    $("#submitButton").hide();
    $("#segmentInvalid").hide();
    $('#stravaSeg').html("")
    $("#confirmStravaSeg").attr("placeholder", "")
  })
})
