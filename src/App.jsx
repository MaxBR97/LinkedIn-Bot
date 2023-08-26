import { useState, useEffect } from 'react'
import axios from 'axios'
import './assets/App.css'

const baseUrl = "http://localhost:3000"
const httpRequestHeaders = {"Content-Type": "application/json"}

const UserTasks = ({userId}) => {
  const [usernameValue, setUsernameValue] = useState("")
  const [passwordValue, setPasswordValue] = useState("")
  const [userScrapeConnectionsValue, setUserScrapeConnectionsValue] = useState(undefined)

  let onUsernameChange = (event) => {
  }

  let onPasswordChange = (event) => {
  }

  let onUserScrapeConnectionsChange = (event) => {
  }

  return (<li>
    <p>Task {userId}</p>
    <label>Username of linkedin user:</label>
    <input className="username" onChange={onUsernameChange} type="text" ></input>
    <label>password of linkedin user:</label>
    <input className="password" onChange={onPasswordChange} type="password" ></input>
    <label>
    Scrape User Connections?
    <input className ="scrapeUserConnections" name="scrapeUserConnections" onChange={onUserScrapeConnectionsChange} 
                                                                type="checkbox" value="Scrape Profile Connections?"></input>
    </label>
    <ConfigureConnectSession userId={userId}/>
  </li>)
}

//[{searchPhrase: x:string, amount: y:number, note: z:string} , ... , ...]
const ConfigureConnectSession = ({userId}) => {
    const [tasks, setTasks] = useState([])

    let addTask = (event) => {
      event.preventDefault()
      setTasks([...tasks, tasks.length+1])
    }
    return(<> 
          <button onClick={addTask}>Add Task</button>
          <ul className="tasks">
            {tasks.map((taskId) => 
              <ConfigurationForm taskId = {taskId} key={taskId}/>)}
          </ul>
        </>
    )
}

const ConfigurationForm = ({taskId}) => {
  const [searchPhraseValue, setSearchPhraseValue] = useState("")
  const [connectionsAmount, setConnectionsAmount] = useState(0)
  const [note, setNote] = useState("")

  const onPhraseChange = (event) => {
    setSearchPhraseValue(event.target.value)
  }
  const onAmountChange = (event) => {
    setConnectionsAmount(event.target.value)
  }
  const onNoteChange = (event) => {
    setNote(event.target.value)
  }
  return (<li className="task">
    <label>Enter search phrase:</label>
    <input className="search_phrase" onChange={onPhraseChange}type="text"/>
    <label>Enter amount of connections:</label>
    <input className="connections_amount" onChange={onAmountChange} type="number"/>
    <label>Enter a note to be sent with the connect (leave empty to not send a note):</label>
    <input className="note" onChange={onNoteChange} type="text"/>
  </li>)
}

const Note = ({ noteContent }) => {
  const lines = noteContent.split("\n");
  //const [keyIndex, setKeyIndex] = useState(0)

  return (
    <>
      <p className="displayNote">
        {lines.map((line, index) => (
          <p key={index}>
            {line}
            <br />
          </p>
        ))}
      </p>
    </>
  )
}

const Table = () => {
  const [usernameValue, setUsernameValue] = useState("")
  const [connectionsTable, setConnectionsTable] = useState(() => {return (<></>)})

  let onUsernameChange = (event) => {
    setUsernameValue(event.target.value)
  }

  let setTable = async (event) => {
    event.preventDefault()
    setConnectionsTable(<>loading...</>)
    await axios.get(baseUrl.concat('/fetch/').concat(usernameValue.toString()))
    .then ((response) => {
      const pendingConnects = response.data.filter( (connect) => !connect.isAccepted)
      const acceptedConnects = response.data.filter( (connect) => connect.isAccepted)
      setConnectionsTable(
      (<>
      <h1>Total Listings: {response.data.length}</h1>
      <br></br>
      <h1>Total Accepted Connections: {acceptedConnects.length}</h1>
      <table>
        <thead>
          <tr>
            <th>Profile Name</th>
            <th>Request Sent At</th>
            <th>Status</th>
          </tr>
        </thead>
      {pendingConnects.map((connect) => 
      <tbody>
        <tr>
          <td>{connect.profile_name}</td>
          <td>{connect.connection_sending_date == undefined ?  "Unknown" : connect.connection_sending_date}</td>
          <td>{connect.isAccepted ? "Connected" : "Pending"}</td>
        </tr>
        </tbody>
      )}
      {acceptedConnects.map((connect) => 
        (<tbody>
          <tr>
            <td>{connect.profile_name}</td>
            <td>{connect.connection_sending_date == undefined ?  "Unknown" : connect.connection_sending_date}</td>
            <td>{connect.isAccepted ? "Connected" : "Pending"}</td>
          </tr>
        </tbody>)
      )}
      </table>
      </>))
    })
  }

  return(
    <>
    <label>Enter Username: </label>
    <input className = "username" onChange={onUsernameChange} type='text'/>
    <button onClick={setTable}>Show connections</button>
    <br></br>
    {connectionsTable}
    </>  
  )
}

const App = () => {
  //let startButton = (event) => {return }
  const [userTasks, setUserTasks] = useState([])
  const [noteContent, setNoteContent] = useState("")
  const [idSupplier, setIdSupplier] = useState(0)

  let startButton = async (event) => {
    event.preventDefault()
    // const url = event.target.urlInput.value
    // console.log("url inserted: ", url)
    //console.log("EVENT OCCURED: ",event.target.getElementByClassName("userTasks"))
    setNoteContent("Executing...")
    //await axios.post(baseUrl.concat('/setupWithoutCookies')). then( res => console.log("res:: ",res.data)). catch( err => console.log("er: ",err))
    await Array.from(event.target.querySelector(".userTasks").childNodes).forEach(async (userTasksNode) => {
      const username = await userTasksNode.querySelector("input.username").value
      const password = await userTasksNode.querySelector("input.password").value
      const scrapeConnections = await userTasksNode.querySelector("input.scrapeUserConnections").checked
      console.log(username, password, String (scrapeConnections))
      const tasks = []
      
      await userTasksNode.querySelector(".tasks").childNodes.forEach( (li) => {
        const phrase = li.querySelector(".search_phrase").value
        const amount = li.querySelector(".connections_amount").value
        const note = li.querySelector(".note").value
        console.log("TASK: ",phrase, amount, note)
        tasks.push({
          searchPhrase: phrase,
          amount: amount,
          note: note
        })
      })
      setNoteContent("Loggining in to: ".concat("\n").concat( username))
      const request = await axios.post(baseUrl.concat('/login'), {username: username, password: password}, httpRequestHeaders)
      .then( async (response) => {
          setNoteContent(response.data)
          console.log("login attempt response: ",response.data)
          if (response.data == "logged in!") {
              if(tasks.length>0){
                  await axios.post (baseUrl.concat('/assignment'), tasks ,httpRequestHeaders)
                  .then( (response) => {
                        console.log(response.data.isDone)
                        setNoteContent("Assignment ".concat(response.data.isDone === true ? " has been successful." : "hasn't completed."). concat(
                          "\nConnection was sent to: ".concat(response.data.requestsSent.reduce((acc, name) => acc.concat(name).concat(" "), ""))
                          .concat("\nTotal connections sent for user ").concat(username).concat(": ").concat(String(response.data.requestsSent.length)))
                        )
                  })
                  .catch ((err) => {setNoteContent(err); 
                                      console.log(err)})
              }
              if(scrapeConnections){
                await axios.post(baseUrl.concat('/checkConnects'), undefined , httpRequestHeaders)
                .then( (response) => {
                  console.log("response from connection scraping: ", response.data)
                  setNoteContent("Finished scraping connections for: ".concat("\n").concat(username))
                })
                .catch((err) => {
                  console.log("error scraping")
                  setNoteContent("Error while scraping connects for user: ".concat(username).concat( "\nServer response: ").concat(err))
                })
              }
          }
          
      })
      .catch((err) => new Prmoise ( (resolve) => {
        setNoteContent(err)
        console.log("log in error: " , err)
      }))
    })
  }

  const addUserTask = (event) => {
    event.preventDefault()
    setUserTasks([...userTasks, idSupplier])
    setIdSupplier(idSupplier+2)
  }

  const removeUserTask = (event, id) => {
    event.preventDefault()
    console.log(event.target)
    console.log(id)
    setUserTasks(userTasks.filter((taskId) => taskId != id))
  }

  return (
    <>
    <h1 className="header">Linkedin Bot</h1>
    <h3 className="header">By Max Brenner</h3>
   <style src="./assets/App.css"></style>
   <Note noteContent={noteContent}/>
    <form onSubmit={startButton}>
      <ul className="userTasks">
       { userTasks.map((userId, index) => {
        return (<div key={userId}>  
                    <UserTasks  userId={index+1} />
                    <button onClick={(event) => removeUserTask(event, userId)}>Remove User Task</button>
                </div>)
         })
       }
      </ul>
      <button onClick={addUserTask}> Add User Task</button>
      <button  type="submit"> Start! </button>
      <Table/>
    </form>
   </>
  )
}
export default App
