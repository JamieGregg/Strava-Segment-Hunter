
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


  $("form#register").submit(function(e){
    e.preventDefault();
    let clubName = $("#clubAlaias").val();
    let password = $("#password").val();
    let emailAddress = $("#emailAddress").val();
    let clubId = $("#clubId").val();

    let postInfo = {
      clubName: clubName,
      password: password,
      emailAddress: emailAddress,
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
        $("#passwordInvalid").html(info.passwordVal)
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
      "<tr><th>" + rank + "</th><td>" + pointsPerson.name + "</td><td>" + pointsPerson.points + "</td></tr>"
    )
  })
}

function loadHeadings(data){
  $('#daily-leaderboard-heading').html(data + " Daily Leaderboard")
  $('#points-leaderboard-heading').html(data + " Points Leaderboard")
}

function clubLink(clubId){
  if(clubId > 0){
    $("#clubLinkTag").show();
    $("#clubLink").attr('href','https://www.strava.com/clubs/' + clubId)
  }
}
