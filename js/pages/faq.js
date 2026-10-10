/* Scripts for faq.html */

/* universal back button */

function goBack(){

const params =
new URLSearchParams(
window.location.search
);

const from =
params.get('from');

if(from){

window.location.href = from;

}else{

window.history.back();

}

}



/* accordion */

document
.querySelectorAll('.question')
.forEach(question=>{

question.addEventListener(
'click',
()=>{

let item=
question.parentElement;

item.classList.toggle(
'active'
);

});

});



/* filter */

function filterFAQ(type,button){

let categories=
document.querySelectorAll(
'.faqCategory'
);

categories.forEach(category=>{

if(type==='all'){

category.style.display='block';

}else{

category.style.display=
category.classList.contains(type)
?'block'
:'none';

}

});

document
.querySelectorAll('.filterBtn')
.forEach(btn=>{

btn.classList.remove(
'active'
);

});

button.classList.add(
'active'
);

}



/* search */

function searchFAQ(){

let input=
document
.getElementById(
'searchInput'
)
.value
.toLowerCase();

let faqItems=
document.querySelectorAll(
'.faqItem'
);

faqItems.forEach(item=>{

let text=
item.innerText.toLowerCase();

item.style.display=
text.includes(input)
?'block'
:'none';

});

}
