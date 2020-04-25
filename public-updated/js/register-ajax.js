$(document).ready(function(){
  $("#confirmation").hide();
  $("#loader").hide();

  $('body').on('click','#confirmClub', function(e){
    $("#confirmation").hide();
    e.preventDefault();
    var lengthOfPassword = $("#password").val();

    if((lengthOfPassword.length < 7) || ($("#password").val() != $("#passwordRetype").val())){
      $('#passwordInvalid').html("Password must be at least 8 characters")
      $('#passwordNotSame').html("Passwords do not match")
    } else {
      $('#passwordInvalid').html("")
      $('#passwordNotSame').html("")
      let clubData = {
        clubId: $('#clubId').val(),
        email:  $('#emailAddress').val()
      }
      $.ajax({
        type: 'POST',
        url: '/validateClub',
        dataType: 'json',
        data: clubData,
        beforeSend: function(){
          // Show image container
          $("#loader").show();
        },
        success: function(info){
          if(info.statusCode === 404){
            $('#passwordNotSame').html("There is no club matching this Id!")
          } else if (info.statusCode === 1500){
            $('#passwordNotSame').html("This club has already registered")
          } else if (info.statusCode === 1501){
            $('#passwordNotSame').html("A user with this email has already registered")
          } else {
            $("#clubName").html(info.clubName)
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
