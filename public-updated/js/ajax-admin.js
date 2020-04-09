$(document).ready(function(){
  $("#loader").hide();
  $("form#addSegment").submit(function(e){
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
      beforeSend: function(){
        $("#loader").show();
      },
      success: function(info){
        alert(info.stravaSegment)
      },
      complete:function(data){
        $("#loader").hide();
      }
    })
  })
})
