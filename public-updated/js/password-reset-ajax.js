alert("Here")

$('body').on('submit','#reset-password', function(e){
  e.preventDefault();

  var emailAddresses = {
    emailForgotten: $("#emailForgotten").val()
  }
  $.ajax({
    type: 'POST',
    url: '/forgot-password',
    dataType: 'json',
    data: emailAddresses,
    success: function(info){
      $("#emailHelp").html(info.response)
    }
  })
})
