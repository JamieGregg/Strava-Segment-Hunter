$(document).ready(function() {
  $.ajax({
      type: 'GET',
      url: '/upcomingSegments',
      success: function(info) {
        loadSegments(info.segment);
      }
  })


  $("#loader").hide();
  $("form#addSegment").submit(function(e) {
      e.preventDefault();
      let segmentId = $("#stravaSeg").val();

      let postData = {
        segmentId: segmentId,
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
            $("#responseSegment").html("Segment has been added")
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
})

function loadSegments(data){
  var dailyLeaderboardTable = $("#segment-table");
  dailyLeaderboardTable.find("tbody tr").remove();
  data.forEach(function(segment){
    dailyLeaderboardTable.append(
      "<tr class=\'text-white\'><th>" + segment[0] + "</th><td class=\'seg-name\'>" + segment[1] + "</td><td><button class=\'delete'\>Clear</button</td</tr>"
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
