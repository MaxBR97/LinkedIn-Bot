const mongoose  = require(`mongoose`)

const connectSchema = new mongoose.Schema ({
    profile_name: String,
    connection_sending_date: String,
    isAccepted: Boolean,
    user: String
})

const Connect = mongoose.model(`Connect`, connectSchema)

module.exports = Connect