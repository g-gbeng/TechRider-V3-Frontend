/* Scripts for techrider-404.html */

function openSupport(){

document
.getElementById(
'supportModal'
)
.style.display='block';

}

function closeSupport(){

document
.getElementById(
'supportModal'
)
.style.display='none';

}


/* click outside closes popup */

window.onclick=function(e){

let modal=
document.getElementById(
'supportModal'
);

if(
e.target===modal
){
closeSupport();
}

};
