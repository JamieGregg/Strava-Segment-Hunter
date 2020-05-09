$(document).ready(function() {
  $("#confirmation-box").hide();
  $("#submitButton").hide();
  $("#segmentInvalid").hide();
  $("#loader").hide();

  $("#continue").click(function() {
    var segmentId = escapeHtml($('#stravaSeg').val())
    let clubData = {
      segmentId: parseInt(segmentId)
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
          $("#segmentInvalid").text("Strava does not regonise this segment");
        } else if(info.statusCode === 401){
          $("#segmentInvalid").show();
          $("#segmentInvalid").text("Strava timed out, try resubmitting");
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
    $('#stravaSeg').text("")
    $("#confirmStravaSeg").attr("placeholder", "")
  })
})

var entityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function (s) {
    return entityMap[s];
  });
}
