var star_limit = (screen.width/128);
body = document.body;
function starPlace(){
    for(var i = 0; i <= star_limit; i++){
        var star = newStar();
        //console.log(star);
        star.style.borderRadius = "60%";
        star.style.top = Math.random()*100+"%";
        star.style.left = Math.random()*100+"%";
        star.style.width = ((Math.random()*5)+1)+"px";
        star.style.height = star.style.width;
        star.style.WebkitAnimationDuration=((Math.random()*5)+4)+"s";
        star.style.MozAnimationDuration=((Math.random()*5)+4)+"s";
        star.style.WebkitAnimationDelay=(Math.random()+1)+"s";
        star.style.MozAnimationDelay=(Math.random()+1)+"s";
        body.appendChild(star);
    }
}

function newStar()
{
  var d = document.createElement('div');
  d.className = "star";
  //console.log(d);
  return d;
}
