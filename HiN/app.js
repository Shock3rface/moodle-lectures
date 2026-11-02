'use strict';
const answers=['b','c','a','b','c'];
const explanations=[
 'Воздух между снежинками плохо проводит тепло. Снег замедляет теплообмен, но не вырабатывает теплоту и не прекращает его полностью.',
 'При испарении вода поглощает энергию. При конденсации и кристаллизации энергия выделяется.',
 'Ледяные цветы растут при десублимации: пар переходит непосредственно в лёд. Обратный переход называется сублимацией.',
 'Неравномерно нагретые слои воздуха по-разному преломляют свет. Настоящей лужи впереди может не быть.',
 'При плавлении чистого льда при постоянном давлении энергия расходуется на изменение состояния, а температура смеси льда и воды остаётся постоянной.'
];
const quiz=document.getElementById('quiz');
quiz.addEventListener('submit',event=>{
 event.preventDefault();let score=0,missing=0,firstMissing=null;
 answers.forEach((answer,i)=>{
  const controls=[...quiz.querySelectorAll(`input[name="q${i+1}"]`)];
  const choice=controls.find(input=>input.checked);const feedback=document.getElementById(`f${i+1}`);
  controls.forEach(input=>{input.setAttribute('aria-describedby',feedback.id);input.removeAttribute('aria-invalid');});
  if(!choice){missing++;firstMissing??=controls[0];feedback.textContent='Выберите один ответ и проверьте ещё раз.';feedback.className='feedback incorrect';controls.forEach(input=>input.setAttribute('aria-invalid','true'));return;}
  const correct=choice.value===answer;if(correct)score++;
  feedback.className=`feedback ${correct?'correct':'incorrect'}`;feedback.textContent=(correct?'Верно. ':'Пока неверно. ')+explanations[i];
 });
 document.getElementById('quiz-result').textContent=missing?`Верно: ${score} из 5. Без ответа: ${missing}.`:`Верно: ${score} из 5. ${score===5?'Отлично! Теперь попробуйте объяснить одно явление своими словами.':'Прочитайте объяснения и попробуйте ещё раз.'}`;
 firstMissing?.focus();
});
quiz.addEventListener('reset',()=>{document.querySelectorAll('.feedback').forEach(el=>{el.textContent='';el.className='feedback';});quiz.querySelectorAll('input').forEach(el=>{el.removeAttribute('aria-describedby');el.removeAttribute('aria-invalid');});document.getElementById('quiz-result').textContent='Ответы сброшены. Можно начать заново.';});
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}}),{threshold:.35});observer.observe(document.querySelector('.phase-display'));}
