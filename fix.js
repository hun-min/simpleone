const fs = require('fs');
let content = fs.readFileSync('src/App.js', 'utf8');

const startIdx = content.indexOf('{incompleteTasks.map((task, idx, arr) => {');
let endIdx = startIdx;
let braceCount = 0;
let inMap = false;

for (let i = startIdx; i < content.length; i++) {
  if (content[i] === '{') braceCount++;
  if (content[i] === '}') braceCount--;
  
  if (braceCount === 0 && content.substring(i, i+3) === '})}') {
    endIdx = i + 3;
    break;
  }
}

const replacement = `{incompleteTasks.map((task) => {
              const timerKey = \`\${dateKey}-\${task.id}\`;
              const seconds = timerSeconds[timerKey] || 0;
              const isRunning = activeTimers[timerKey];
              
              return (
                <TaskCard
                  key={task.id}
                  task={task}
                  dateKey={dateKey}
                  dates={dates}
                  isRunning={isRunning}
                  seconds={seconds}
                  editingTaskId={editingTaskId}
                  setEditingTaskId={setEditingTaskId}
                  autocompleteData={autocompleteData}
                  setAutocompleteData={setAutocompleteData}
                  updateTask={updateTask}
                  toggleTimer={toggleTimer}
                  cancelTimer={(e) => cancelTimer(e, timerKey)}
                  setContextMenu={setContextMenu}
                  setSubTasksPopup={setSubTasksPopup}
                  setObstaclePopup={setObstaclePopup}
                  draggedTaskId={draggedTaskId}
                  setDraggedTaskId={setDraggedTaskId}
                  saveTasks={saveTasks}
                  timerLogs={timerLogs}
                  newlyCreatedTasks={newlyCreatedTasks}
                />
              );
            })}`;

const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync('src/App.js', newContent, 'utf8');
console.log('Done');
