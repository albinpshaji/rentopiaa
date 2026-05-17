import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import API from "../api";
import "./ChatBox.css";

const SOCKET_URL = "http://localhost:5000";

const ChatBox = ({ rentalId, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const socketRef = useRef(null);

    // Get the current logged-in user
    const currentUser = JSON.parse(localStorage.getItem("user") || "null");

    // Scroll to bottom of messages (inside the chat container only, not the whole page)
    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    // Fetch existing messages + setup Socket.IO
    useEffect(() => {
        // Fetch messages from API
        const fetchMessages = async () => {
            try {
                const res = await API.get(`/api/messages/${rentalId}`);
                setMessages(res.data);
            } catch (err) {
                console.error("Error fetching messages:", err);
            }
        };
        fetchMessages();

        // Connect to Socket.IO
        socketRef.current = io(SOCKET_URL);
        socketRef.current.emit("joinRental", rentalId);

        // Listen for real-time messages
        socketRef.current.on("newMessage", (message) => {
            setMessages((prev) => {
                // Prevent duplicates (in case the sender also receives their own message)
                if (prev.some((m) => m._id === message._id)) return prev;
                return [...prev, message];
            });
        });

        // Cleanup on unmount
        return () => {
            socketRef.current.emit("leaveRental", rentalId);
            socketRef.current.disconnect();
        };
    }, [rentalId]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Send a message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim() || sending) return;

        setSending(true);
        try {
            await API.post(`/api/messages/${rentalId}`, { text: text.trim() });
            setText("");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="chatbox-container">
            <div className="chatbox-header">
                <span>💬 Chat</span>
                <button onClick={onClose}>✕ Close</button>
            </div>

            <div className="chatbox-messages" ref={messagesContainerRef}>
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        No messages yet. Say hello! 👋
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMine = msg.sender?._id === currentUser?._id || msg.sender === currentUser?._id;
                        return (
                            <div
                                key={msg._id}
                                className={`chat-msg ${isMine ? "mine" : "theirs"}`}
                            >
                                {!isMine && (
                                    <div className="msg-sender">
                                        {msg.sender?.name || "User"}
                                    </div>
                                )}
                                <div>{msg.text}</div>
                                <div className="msg-time">
                                    {new Date(msg.createdAt).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="chatbox-input" onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    autoFocus
                />
                <button type="submit" disabled={!text.trim() || sending}>
                    {sending ? "..." : "Send"}
                </button>
            </form>
        </div>
    );
};

export default ChatBox;
