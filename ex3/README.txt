==== INTERNET TECHNOLOGIES - EX3 ===

~General Description~
In this project we had to finally address the good old client-server 
communication task. Using the Node js module we created a server supporting 
multiple and asynchronic HTTP requests and generate a corrsponding response.
Each request-response pair is proccesed in several steps: Inital parsing of 
the request, extracting all relevant meta data and body if exists. Matching 
the request command to its compatible middleware handler which, in turn, uses 
our response object's built-in `send' method to ship an HTTP respone back to
the client. 

We would like to adress to points raised in the project description:

* The part we found the most challenging was desiging the framework under the 
  relativly novel abstract concepts for us. The asynchronic nature of servers 
  and the event-driven approach of javascript and node js in particular. We 
  struggeld initally tackling them due to a lack of experience in this area
  (somehow we both managed to evade the former server establishment projects 
  for various reasons). 

* As for the most fun part, We both believe that every opportunity for
  understanding new concepts satifies our intellectual curiosity. We find that
  working with a partner could be more inspiring and productive as you learn 
  from the other his ideas and approach to challenges.

* We tested our server using different tactits; To reproduce request generated
  in real time we have used a Firefox addon which can be easily configured to
  answer our needs, As well as writing our own several tests (one of which is
  the one we were asked to submit) and using our peers' tests. In each of the 
  tests we validated server functionality and compared our generated responses 
  to the desired output; also using ExpressJS guide as reference.
