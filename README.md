
## Messages Types

Messages in smartsocket are colon `:` delimited

### Upstream

The server needs to handle the following message types

  * `subscribe:[subscription]`
  * `unsubscribeAll:`
  * `set:[key]:[value]`
  * `delete:[key]`

### Downstream

  * add:[key]:[value]
  * delete:[key]:[value]
