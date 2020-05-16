$(document).ready(function() {
  $.ajax({
      type: 'GET',
      url: '/upcomingSegments',
      success: function(info) {
        loadSegments(info.segment);
      }
  })


  $('form#delete').click(function () {
    if (confirm("Are you sure you want to delete all results? This cannot be undone.")) {
        $.ajax({
          type: 'DELETE',
          url: '/deleteDatabase'
        });
    } else {
      alert('The leaderboard has not been reset!');
    }
  });


  $("#loader").hide();
  $("form#addSegment").submit(function(e) {
      e.preventDefault();
      let segmentId = escapeHtml($("#stravaSeg").val());

      let postData = {
        segmentId: parseInt(segmentId),
      }

      $.ajax({
          type: 'POST',
          url: '/addSegment',
          dataType: 'json',
          data: postData,
          beforeSend: function() {
            $("#loader").show();
          },
          success: function(info) {
            $("#responseSegment").text("Segment has been added (You may need to refresh your page to see segment in the table below)")
            $("#stravaSeg").removeAttr("disabled")
            $("#stravaSeg").val("")
            $.ajax({
                type: 'GET',
                url: '/upcomingSegments',
                success: function(info) {
                  loadSegments(info.segment);
                }
            })
        },
        complete: function(data) {
          $("#loader").hide();
        }
      })
  })

  $("#cancel").click(function (e) {
    $("#continueButton").show();
    $("#confirmation-box").hide();
    $("#submitButton").hide();
    $("#segmentInvalid").hide();
    $('#stravaSeg').text("")
    $("#confirmStravaSeg").attr("placeholder", "")
    $("#stravaSeg").removeAttr("disabled")
  })
})

function loadSegments(data){
  var dailyLeaderboardTable = $("#segment-table");
  dailyLeaderboardTable.find("tbody tr").remove();
  data.forEach(function(segment){
    dailyLeaderboardTable.append(
      "<tr class=\'text-white\'><th>" + segment[0] + "</th><td class=\'seg-name\'>" + segment[1] + "</td><td><button class=\'delete'\>Delete</button</td</tr>"
    )
  })
}

$(document).on("click", ".delete", function(){
  $(this).parents("tr").remove();
  $(".add-new").removeAttr("disabled");
    var postData = {
      segmentName: $(this).closest("tr").find(".seg-name").text()
    }
    $.ajax({
      type: 'POST',
      url: '/deleteSegment',
      dataType: 'json',
      data: postData,
      success: function(info) {
      },
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
