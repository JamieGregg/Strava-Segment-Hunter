$(document).ready(function(){

  $(window).keydown(function (event) {
    if (event.keyCode == 13) {
      event.preventDefault();
      return false;
    }
  });
  
  $("#confirmation").hide();
  $("#loader").hide();

  $('body').on('click','#confirmClub', function(e){
    $("#confirmation").hide();
    e.preventDefault();
    var lengthOfPassword = escapeHtml($("#password").val());

    if((lengthOfPassword.length < 7) || ($("#password").val() != $("#passwordRetype").val())){
      $('#passwordInvalid').text("Password must be at least 8 characters")
      $('#passwordNotSame').text("Passwords do not match")
    } else {
      $('#passwordInvalid').text("")
      $('#passwordNotSame').text("")
      let clubData = {
        clubId: escapeHtml($('#clubId').val()),
        email: escapeHtml($('#emailAddress').val())
      }
      $.ajax({
        type: 'POST',
        url: '/validateClub',
        dataType: 'json',
        data: clubData,
        beforeSend: function(){
          $("#loader").show();
        },
        success: function(info){
          if(info.statusCode === 404){
            $('#passwordNotSame').text("There is no club matching this Id!")
          } else if (info.statusCode === 1500){
            $('#passwordNotSame').text("This club has already registered")
          } else if (info.statusCode === 1501){
            $('#passwordNotSame').text("Email Address has already been registered")
          } else {
            escapeHtml($("#clubName").text(info.clubName))
            $("#club-icon").attr("src", info.clubIcon)
            $("#confirmation").show();
          }
        }, complete:function(data){
          // Hide image container
          $("#loader").hide();
        }
      })
    }
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
