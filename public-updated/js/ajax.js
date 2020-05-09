
$(document).ready(function(){
  $("#loader").hide();
  $("form.filterTable").submit(function(e){
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
      url: '/loadleaderboard',
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
        loadSegments(info)
      },
      complete:function(data){
        // Hide image container
        $("#loader").hide();
      }
    })
  })


  $("form#register").submit(function(e){
    e.preventDefault();
    let clubName = escapeHtml($("#clubAlaias").val());
    let password = escapeHtml($("#password").val());
    let emailAddress = escapeHtml($("#emailAddress").val());
    let clubId = escapeHtml($("#clubId").val());

    let postInfo = {
      clubName: clubName,
      password: password,
      username: emailAddress,
      clubId: clubId
    }

    $.ajax({
      type: 'POST',
      url: '/register',
      dataType: 'json',
      data: postInfo,
      beforeSend: function(){
        $("#loader").show();
      },
      success: function(info){
        $("#passwordInvalid").text(info.passwordVal)
      },
      complete:function(data){
        // Hide image container
        $("#loader").hide();
      }
    })
  })
})

function loadDaily(data){
  var dailyLeaderboardTable = $("#daily-leaderboard-table");
  dailyLeaderboardTable.find("tbody tr").remove();
  data.forEach(function(person){
    dailyLeaderboardTable.append(
      "<tr class=\'text-white\'><th>" + person[2] + "</th><td>" + person[0] + "</td><td>" + person[1] + "</td></tr>"
    )
  })
}

function loadPoints(data){
  var pointsLeaderboardTable = $("#points-leaderboard-table");
  pointsLeaderboardTable.find("tbody tr").remove();

  var lastPoints = -1;
  var rank = 0;

  data.forEach(function(pointsPerson){
    if(pointsPerson.points != lastPoints) {
      rank = rank + 1;
      lastPoints = pointsPerson.points;
    }

    pointsLeaderboardTable.append(
      "<tr><th>" + rank + "</th><td class=\'text-center\'>" + pointsPerson.name + "</td><td class=\'text-center\'>" + pointsPerson.points + "</td></tr>"
    )
  })
}

function loadHeadings(data){
  $('#daily-leaderboard-heading').text(data + " Weekly Leaderboard")
  $('#points-leaderboard-heading').text(data + " Points Leaderboard")
  $('.segment-heading').text(data + " Weekly Segment")
}

function clubLink(clubId){
  if(clubId > 0){
    $("#clubLinkTag").show();
    $("#clubLink").attr('href','https://www.strava.com/clubs/' + clubId)
  }
}

function loadSegments(data){
  $('.seg-name').text(data.segmentInfo.name)
  $('.seg-grade').text("Average Grade: " + data.segmentInfo.average_grade)
  $('.seg-distance').text("Distance: " + data.segmentInfo.distance)
  $('.seg-efforts').text("Number of Attempts: " + data.segmentInfo.efforts)
  $('.seg-link').attr('href', data.segmentInfo.link)

  $('.day-one').text(data.dayOne[0])
  $('.day-two').text(data.dayTwo[0])
  $('.day-three').text(data.dayThree[0])
  $('.day-four').text(data.dayFour[0])

  $('.day-one').attr('href', data.dayOne[1])
  $('.day-two').attr('href', data.dayTwo[1])
  $('.day-three').attr('href', data.dayThree[1])
  $('.day-four').attr('href', data.dayFour[1])
}


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