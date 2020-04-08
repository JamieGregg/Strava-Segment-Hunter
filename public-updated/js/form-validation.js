$(document)
.on('click', 'form button[type=submit]', function(e) {
    var lengthOfPassword = $("#password").val();

    if(lengthOfPassword.length < 7){
      e.preventDefault();
      $('#passwordInvalid').html("Password must be at least 8 characters")
    }
});
