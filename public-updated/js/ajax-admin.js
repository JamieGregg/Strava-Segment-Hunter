$(document).ready(function(){
  $("#loader").hide();
  $("form#filterTable").submit(function(e){
    e.preventDefault();
    let clubId = $("#club option:selected").val();
    let masters = $("#masters option:selected").val();
    let gender = $("#gender option:selected").val();

    let postData = {
      masters: masters,
      clubs: clubId,
      gender: gender
    }

    $.ajax({
      type: 'POST',
      url: '/test',
      dataType: 'json',
      data: postData,
      beforeSend: function(){
        // Show image container
        $("#loader").show();
      },
      success: function(info){
        loadHeadings(info.clubName)
        clubLink(info.clubId)
        loadDaily(info.data)
        loadPoints(info.db)
      },
      complete:function(data){
        // Hide image container
        $("#loader").hide();
      }
    })
  })
