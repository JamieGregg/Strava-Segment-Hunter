
$('body').on('submit','#reset-password', function(e){
  e.preventDefault()

  var emailAddresses = {
    emailForgotten: escapeHtml($("#emailForgotten").val())
  }
  $.ajax({
    type: 'POST',
    url: '/forgot-password',
    dataType: 'json',
    data: emailAddresses,
    success: function(info){
      $("#emailHelp").text(info.response)
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
