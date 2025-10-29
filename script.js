document.getElementById("testForm").addEventListener("submit", function(e){
  e.preventDefault();
  let score = 0;
  const answers = document.querySelectorAll("input[type='radio']:checked");
  answers.forEach(a => score += parseInt(a.value));

  let message = "";
  if(score >= 5) message = "High metacognition awareness!";
  else if(score >= 3) message = "Moderate awareness — room to grow.";
  else message = "Low awareness — try observing your own thinking more closely.";

  document.getElementById("result").textContent = message;
});
