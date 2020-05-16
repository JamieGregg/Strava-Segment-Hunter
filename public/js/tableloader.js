
$(function() {
  $("form").submit(function(){
    $.ajax({
      url: '/clubLoad',
      cache: false,
      contentType: 'application/json',
      success: function(response){
        for(let i = 0; i < clubInfo.length; i++){
          var o = new Option(response.clubInfo[i][2], response.clubInfo[i][1]);
          $(o).html(response.clubInfo[i][2]);
          $('#club').append(o)
          alert("yep")
        }
      }
    })
  })
})
