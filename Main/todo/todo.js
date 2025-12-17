import PocketBase from "https://unpkg.com/pocketbase@latest/dist/pocketbase.es.mjs";
const pb = new PocketBase('http://pluggo.cloud.mustini.com');
// Hard-coded for now
const userName = "test";
const userEmail = "whydoweneedemail@gmail.com"
//It is used in the getTaskId function
const taskId = "";
var userId = await pb.collection("users").authWithPassword(userEmail, "test1234");
userId = userId.record.id;
async function getTodos() {
  return await pb.collection("todos").getList(1, 50, {
    filter: `relation = "${userId}"`,
  });
}
//Just call this one whenever you want to fetch and save todos locally
async function fetchTodos() {
  const todos = await getTodos();
  const allTodos = {};
  let index = 1;
  for (const task of todos.items) {
    allTodos[index++]= {
      date: task.date,
      lage: task.lage,
      name: task.name,
      priority: task.priority,
    };
  }
  return allTodos;
}
//Do this whenever you want to fetch and save todos locally
/*
var localTodos = await fetchTodos();
localTodos = sortLocalTodos(localTodos);
*/
//Create and Add todos to the database
function createTask(name, date, lage, priority){
  const data= {
    name: name,
    date: date,
    lage: lage,
    priority: priority,
    relation: userId
  };
  return data;
}
function addTaskToDB(taskData){
  pb.collection("todos").create(taskData).then((res)=>{
    console.log();
  }).catch((err)=>{
    console.error("Error adding task:", err);
  });
}
async function resolveTaskId(task, userId){
  const res = await pb.collection("todos").getFirstListItem(
    `name = "${task.name}" && relation = "${userId}"` 
  );
  return res.id;
}
async function deleteTaskFromDB(taskNumber, tasks) {
  const task = tasks[taskNumber];
  if (!task) {
    console.log("Errors: Task not found");
    return;
  }
  const taskId = await resolveTaskId(task, userId);
  // archive
  await pb.collection("done_tasks").create({
    name: task.name,
    date: task.date,
    priority: task.priority,
    relation: userId,
  });
  // delete remote
  await pb.collection("todos").delete(taskId);
  // delete locally LAST (I think this is the correct implimentation)
  delete tasks[taskNumber];
}
function sortLocalTodos(localTodos) {
   //Project object => array
  const tasks = Object.values(localTodos);
  //Sort by priority, then by date
  tasks.sort((a, b) => {
    // Primary: priority (3 = highest importance) (Reversed the order)
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    //Secondary: due date (earlier = more important)
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;
  });
  //Re-index into ranked object
  const sortedTodos = {};
  let rank = 1;
  for (const task of tasks) {
    sortedTodos[rank++] = task;
  }
  return sortedTodos;
}
var localTodos = await fetchTodos();
console.log(localTodos);
localTodos = sortLocalTodos(localTodos);
console.log(localTodos);

// ============================================================================
// FRONTEND CODE BELOW =§> Connection to PocketBase
// ============================================================================

let currentView = 'table';
let openPopupId = null;
let tasks = localTodos; // Use the sorted todos from database

//pretty self explanatory
function getPriorityClass(priority) {
    if (priority === 1) return 'low';
    if (priority === 2) return 'medium';
    if (priority === 3) return 'high';
    return 'low';
}
// :/
function getLageClass(lage) {
    if (lage === 0) return 'not-started';
    if (lage === 1) return 'ongoing';
    if (lage === 2) return 'done';
    return 'not-started';
}

//You should know this one
function getLageText(lage) {
    if (lage === 0) return 'Not Started';
    if (lage === 1) return 'Ongoing';
    if (lage === 2) return 'Done';
    return 'Not Started';
}

// Function to close all popups
function closeAllPopups() {
    document.querySelectorAll('.lage-popup').forEach(popup => popup.remove());
    openPopupId = null;
}

// Function to update task status in database
async function updateTaskStatus(taskNumber, newLage) {
    const task = tasks[taskNumber];
    if (!task) return;

    try {
        const taskId = await resolveTaskId(task, userId);
        await pb.collection("todos").update(taskId, { lage: newLage });
        
        // Update locally
        tasks[taskNumber].lage = newLage;
        
        // If status changed to done 2, move to done_tasks
        if (newLage === 2) {
            await deleteTaskFromDB(taskNumber, tasks);
            // Refresh tasks from database
            tasks = await fetchTodos();
            tasks = sortLocalTodos(tasks);
        }
        
        renderView();
    } catch (err) {
        console.error("Error updating task status:", err);
    }
}

// Function to create lage popup
function createLagePopup(taskId, taskBox) {
    closeAllPopups();
    
    const popup = document.createElement('div');
    popup.className = 'lage-popup';

    for (let i = 0; i < 3; i++) {
        const option = document.createElement('div');
        option.className = 'lage-option';
        
        const circle = document.createElement('div');
        circle.className = `lage-option-circle ${getLageClass(i)}`;
        
        const text = document.createElement('span');
        text.textContent = getLageText(i);
        
        option.appendChild(circle);
        option.appendChild(text);
        
        option.onclick = async (e) => {
            e.stopPropagation();
            await updateTaskStatus(taskId, i);
            closeAllPopups();
        };
        
        popup.appendChild(option);
    }

    taskBox.appendChild(popup);
    openPopupId = taskId;
}

// Function to render board view
function renderBoard() {
    localTodos = sortLocalTodos(localTodos);
    const contentArea = document.getElementById('contentArea');
    const boardGrid = document.createElement('div');
    boardGrid.className = 'board-grid';

    for (const [id, task] of Object.entries(tasks)) {
        const taskBox = document.createElement('div');
        taskBox.className = 'task-box';

        const circles = document.createElement('div');
        circles.className = 'task-circles';

        const lageCircle = document.createElement('div');
        lageCircle.className = `circle lage-circle ${getLageClass(task.lage)}`;
        lageCircle.onclick = (e) => {
            e.stopPropagation();
            if (openPopupId === id) {
                closeAllPopups();
            } else {
                createLagePopup(id, taskBox);
            }
        };

        const priorityCircle = document.createElement('div');
        priorityCircle.className = `priority-rect ${getPriorityClass(task.priority)}`;

        circles.appendChild(lageCircle);
        circles.appendChild(priorityCircle);

        const taskName = document.createElement('div');
        taskName.className = 'task-name';
        taskName.textContent = task.name;

        const taskDate = document.createElement('div');
        taskDate.className = 'task-date';
        taskDate.textContent = task.date;

        taskBox.appendChild(circles);
        taskBox.appendChild(taskName);
        taskBox.appendChild(taskDate);

        boardGrid.appendChild(taskBox);
    }

    contentArea.innerHTML = '';
    contentArea.appendChild(boardGrid);
}

// Function to render table view
function renderTable() {
    localTodos = sortLocalTodos(localTodos);
    const contentArea = document.getElementById('contentArea');
    const tableView = document.createElement('div');
    tableView.className = 'table-view';

    const table = document.createElement('table');
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Status', 'Priority', 'Task Name', 'Date'].forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const [id, task] of Object.entries(tasks)) {
        const row = document.createElement('tr');
        row.className = 'table-row';

        const statusCell = document.createElement('td');
        const lageCircle = document.createElement('div');
        lageCircle.className = `circle lage-circle ${getLageClass(task.lage)}`;
        lageCircle.style.position = 'relative';
        lageCircle.onclick = (e) => {
            e.stopPropagation();
            if (openPopupId === id) {
                closeAllPopups();
            } else {
                createLagePopup(id, statusCell);
            }
        };
        statusCell.appendChild(lageCircle);
        row.appendChild(statusCell);

        const priorityCell = document.createElement('td');
        const priorityRect = document.createElement('div');
        priorityRect.className = `priority-rect ${getPriorityClass(task.priority)}`;
        priorityCell.appendChild(priorityRect);
        row.appendChild(priorityCell);

        const nameCell = document.createElement('td');
        nameCell.textContent = task.name;
        row.appendChild(nameCell);

        const dateCell = document.createElement('td');
        dateCell.textContent = task.date;
        row.appendChild(dateCell);

        tbody.appendChild(row);
    }
    table.appendChild(tbody);
    tableView.appendChild(table);

    contentArea.innerHTML = '';
    contentArea.appendChild(tableView);
}

// Function to render current view
function renderView() {
    if (currentView === 'board') {
        renderBoard();
    } else {
        renderTable();
    }
}

// Sidebar button
const sidebarBtn = document.getElementById('sidebarBtn');
sidebarBtn.addEventListener('click', () => {
    console.log('sidebar');
});

// Toggle buttons
const toggleOptions = document.querySelectorAll('.toggle-option');
toggleOptions.forEach(option => {
    option.addEventListener('click', () => {
        toggleOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        currentView = option.dataset.view;
        renderView();
        console.log('toggle');
    });
});

// New button
const newBtn = document.getElementById('newBtn');
const newTaskPopup = document.getElementById('newTaskPopup');
const closePopup = document.getElementById('closePopup');
const createTaskBtn = document.getElementById('createTaskBtn');
const taskNameInput = document.getElementById('taskNameInput');

newBtn.addEventListener('click', () => {
    newTaskPopup.style.display = 'flex';
    taskNameInput.value = '';
    document.getElementById('taskDateInput').value = '';
    console.log('New todo');
});

closePopup.addEventListener('click', () => {
    newTaskPopup.style.display = 'none';
});

newTaskPopup.addEventListener('click', (e) => {
    if (e.target === newTaskPopup) {
        newTaskPopup.style.display = 'none';
    }
});

createTaskBtn.addEventListener('click', async () => {
    const taskName = taskNameInput.value.trim();
    const taskDate = document.getElementById('taskDateInput').value.trim();
    const priority = parseInt(document.querySelector('input[name="priority"]:checked').value);
    const status = parseInt(document.querySelector('input[name="status"]:checked').value);
    
    if (taskName) {
        const dateToUse = taskDate || new Date().toISOString().split('T')[0];
        
        // Create task data and add to database
        const taskData = createTask(taskName, dateToUse, status, priority);
        addTaskToDB(taskData);
        
        // Wait a moment for database to update, then refresh
        setTimeout(async () => {
            tasks = await fetchTodos();
            tasks = sortLocalTodos(tasks);
            renderView();
        }, 500);
        
        newTaskPopup.style.display = 'none';
        console.log('Task created:', taskData);
    }
});

// Done & Deleted button
const doneDeletedBtn = document.getElementById('doneDeletedBtn');
const doneDeletedPopup = document.getElementById('doneDeletedPopup');
const closeDoneDeletedPopup = document.getElementById('closeDoneDeletedPopup');
const doneDeletedContent = document.getElementById('doneDeletedContent');

doneDeletedBtn.addEventListener('click', async () => {
    doneDeletedContent.innerHTML = '';
    
    try {
        // Fetch done tasks from database
        const doneTasks = await pb.collection("done_tasks").getList(1, 50, {
            filter: `relation = "${userId}"`,
            sort: '-created',
        });
        
        doneTasks.items.forEach(task => {
            const taskItem = document.createElement('div');
            taskItem.className = 'done-task-item';
            
            const taskName = document.createElement('div');
            taskName.className = 'done-task-name';
            taskName.textContent = task.name;
            
            const taskDate = document.createElement('div');
            taskDate.className = 'done-task-date';
            taskDate.textContent = task.date;
            
            taskItem.appendChild(taskName);
            taskItem.appendChild(taskDate);
            doneDeletedContent.appendChild(taskItem);
        });
        
        doneDeletedPopup.style.display = 'flex';
        console.log('Done & Deleted');
    } catch (err) {
        console.error("Error fetching done tasks:", err);
    }
});

closeDoneDeletedPopup.addEventListener('click', () => {
    doneDeletedPopup.style.display = 'none';
});

doneDeletedPopup.addEventListener('click', (e) => {
    if (e.target === doneDeletedPopup) {
        doneDeletedPopup.style.display = 'none';
    }
});

// Close popups when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.lage-circle') && !e.target.closest('.lage-popup')) {
        closeAllPopups();
    }
});

//Lets GOOOOOOO

renderView();
