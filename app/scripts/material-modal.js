/**
 * Created by aperritano on 11/20/15.
 */

/*
 The code below will manage
 the mouseover, onclick, and
 mouseout events.
 */

// Capture touch capability
var touchEnabled = false;

//
// DIV BUTTON ONE
//

// First add the button id found in the html
//var buttonOneTouchTarget = "buttonOneTouchTarget";
//var buttonOne = "buttonOne";
//
//// Declare function to manage mouse over event.
//var buttonOneOnMouseOver = document.getElementById(buttonOneTouchTarget);
//buttonOneOnMouseOver.onmouseover = function(){
//  console.log("Div button " + buttonOne + " on mouse over");
//  document.getElementById(buttonOne).style.backgroundColor = "rgba(99,99,99,0.2)";
//}
//
//// Declare function to manage mouse down event.
//var buttonOneOnMouseDown = document.getElementById(buttonOneTouchTarget);
//buttonOneOnMouseDown.onmousedown = function(){
//  console.log("Div button " + buttonOne + " on mouse down");
//  document.getElementById(buttonOne).style.backgroundColor = "rgba(99,99,99,0.4)";
//}
//
//// Declare function to manage mouse down event on iOS Safari
//var buttonOneOnTouchStart = document.getElementById(buttonOneTouchTarget);
//buttonOneOnTouchStart.ontouchstart = function(){
//  console.log("Div button " + buttonOne + " on touch start");
//  document.getElementById(buttonOne).style.backgroundColor = "rgba(99,99,99,0.4)";
//  touchEnabled = true;
//}
//
//// Declare function to manage mouse up event.
//var buttonOneOnMouseUp = document.getElementById(buttonOneTouchTarget);
//buttonOneOnMouseUp.onmouseup = function(){
//  if(touchEnabled === false){
//    console.log("Div button " + buttonOne + " on mouse up" + " A");
//    document.getElementById(buttonOne).style.backgroundColor = "rgba(99,99,99,0.2)";
//  }else{
//    console.log("Div button " + buttonOne + " on mouse up" + " B");
//    document.getElementById(buttonOne).style.backgroundColor = "rgba(99,99,99,0)";
//  }
//}
//
//// Declare function to manage mouse on click event.
//var buttonOneOnClick = document.getElementById(buttonOneTouchTarget);
//buttonOneOnClick.onclick = function(){
//  if(touchEnabled === false){
//    console.log("Div button " + buttonOne + " on click" + " A");
//    document.getElementById(buttonOne).style.backgroundColor = "rgba(99,99,99,0.2)";
//  }else{
//    console.log("Div button " + buttonOne + " on cick" + " B");
//    document.getElementById(buttonOne).style.backgroundColor = "rgba(99,99,99,0)";
//  }
//}
//
//// Declare function to manage mouse out event.
//var buttonOneOnMouseOut = document.getElementById(buttonOneTouchTarget);
//buttonOneOnMouseOut.onmouseout = function(){
//  console.log("Div button " + buttonOne + " on mouse out");
//  document.getElementById(buttonOne).style.backgroundColor = "rgba(99,99,99,0)";
//}

//
// DIV BUTTON TWO
//

// First add the button id found in the html
var selectButtonTouchTarget = "buttonTwoTouchTarget";
var selectButton = "buttonTwo";

// Declare function to manage mouse over event.
var buttonTwoOnMouseOver = document.getElementById(selectButtonTouchTarget);
buttonTwoOnMouseOver.onmouseover = function(){
  console.log("Div button " + selectButton + " on mouse over");
  document.getElementById(selectButton).style.backgroundColor = "rgba(99,99,99,0.2)";
}

// Declare function to manage mouse down event.
var selectButtonOnMouseDown = document.getElementById(selectButtonTouchTarget);
selectButtonOnMouseDown.onmousedown = function(){
  console.log("Div button " + selectButton + " on mouse down");
  document.getElementById(selectButton).style.backgroundColor = "rgba(99,99,99,0.4)";
}

// Declare function to manage mouse down event on iOS Safari
var selectButtonOnTouchStart = document.getElementById(selectButtonTouchTarget);
selectButtonOnTouchStart.ontouchstart = function(){
  console.log("Div button " + selectButton + " on touch start");
  document.getElementById(selectButton).style.backgroundColor = "rgba(99,99,99,0.4)";
  touchEnabled = true;
}

// Declare function to manage mouse up event.
var selectButtonOnMouseUp = document.getElementById(selectButtonTouchTarget);
selectButtonOnMouseUp.onmouseup = function(){
  if(touchEnabled === false){
    console.log("Div button " + selectButton + " on mouse up" + " A");
    document.getElementById(selectButton).style.backgroundColor = "rgba(99,99,99,0.2)";
  }else{
    console.log("Div button " + selectButton + " on mouse up" + " B");
    document.getElementById(selectButton).style.backgroundColor = "rgba(99,99,99,0)";
  }
}

// Declare function to manage mouse on click event.
//var selectButtonOnClick = document.getElementById(selectButtonTouchTarget);
//selectButtonOnClick.onclick = function(){
//  if(touchEnabled === false){
//    console.log("Div button " + selectButton + " on click" + " A");
//    document.getElementById(selectButton).style.backgroundColor = "rgba(99,99,99,0.2)";
//  }else{
//    console.log("Div button " + selectButton + " on cick" + " B");
//    document.getElementById(selectButton).style.backgroundColor = "rgba(99,99,99,0)";
//  }
//}

// Declare function to manage mouse out event.
var selectButtonOnMouseOut = document.getElementById(selectButtonTouchTarget);
selectButtonOnMouseOut.onmouseout = function(){
  console.log("Div button " + selectButton + " on mouse out");
  document.getElementById(selectButton).style.backgroundColor = "rgba(99,99,99,0)";
}


