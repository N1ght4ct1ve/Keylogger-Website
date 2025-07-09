class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.gameOverElement = document.getElementById('gameOver');
        this.finalScoreElement = document.getElementById('finalScore');
        
        // Game settings
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;
        
        // Game state
        this.snake = [
            {x: 10, y: 10}
        ];
        this.food = {};
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        this.gameRunning = false;
        this.gamePaused = false;
        
        // Load high score
        this.highScore = localStorage.getItem('snakeHighScore') || 0;
        this.highScoreElement.textContent = this.highScore;
        
        this.generateFood();
        this.setupEventListeners();
        this.draw();
    }
    
    setupEventListeners() {
        // Button events
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    }
    
    handleKeyPress(e) {
        if (!this.gameRunning || this.gamePaused) return;
        
        const keyPressed = e.key;
        const goingUp = this.dy === -1;
        const goingDown = this.dy === 1;
        const goingRight = this.dx === 1;
        const goingLeft = this.dx === -1;
        
        // Arrow keys and WASD
        if ((keyPressed === 'ArrowLeft' || keyPressed === 'a' || keyPressed === 'A') && !goingRight) {
            this.dx = -1;
            this.dy = 0;
        }
        if ((keyPressed === 'ArrowUp' || keyPressed === 'w' || keyPressed === 'W') && !goingDown) {
            this.dx = 0;
            this.dy = -1;
        }
        if ((keyPressed === 'ArrowRight' || keyPressed === 'd' || keyPressed === 'D') && !goingLeft) {
            this.dx = 1;
            this.dy = 0;
        }
        if ((keyPressed === 'ArrowDown' || keyPressed === 's' || keyPressed === 'S') && !goingUp) {
            this.dx = 0;
            this.dy = 1;
        }
    }
    
    startGame() {
        if (this.gameRunning) return;
        
        this.gameRunning = true;
        this.gamePaused = false;
        
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        this.gameLoop();
    }
    
    togglePause() {
        if (!this.gameRunning) return;
        
        this.gamePaused = !this.gamePaused;
        document.getElementById('pauseBtn').textContent = this.gamePaused ? 'Resume' : 'Pause';
        
        if (!this.gamePaused) {
            this.gameLoop();
        }
    }
    
    resetGame() {
        this.gameRunning = false;
        this.gamePaused = false;
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;
        this.score = 0;
        
        this.scoreElement.textContent = this.score;
        this.gameOverElement.style.display = 'none';
        
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
        
        this.generateFood();
        this.draw();
    }
    
    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;
        
        setTimeout(() => {
            this.clearCanvas();
            this.moveSnake();
            this.drawFood();
            this.drawSnake();
            
            if (this.checkGameOver()) {
                this.endGame();
                return;
            }
            
            this.gameLoop();
        }, 150);
    }
    
    clearCanvas() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    moveSnake() {
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};
        
        this.snake.unshift(head);
        
        // Check if food is eaten
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.scoreElement.textContent = this.score;
            
            // Add score animation
            this.scoreElement.classList.add('score-animation');
            setTimeout(() => {
                this.scoreElement.classList.remove('score-animation');
            }, 300);
            
            this.generateFood();
            
            // Save score to server
            this.saveScore();
        } else {
            this.snake.pop();
        }
    }
    
    drawSnake() {
        this.snake.forEach((segment, index) => {
            if (index === 0) {
                // Head
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
                
                // Eyes
                this.ctx.fillStyle = 'white';
                this.ctx.fillRect(segment.x * this.gridSize + 5, segment.y * this.gridSize + 5, 3, 3);
                this.ctx.fillRect(segment.x * this.gridSize + 12, segment.y * this.gridSize + 5, 3, 3);
            } else {
                // Body
                this.ctx.fillStyle = '#8BC34A';
                this.ctx.fillRect(segment.x * this.gridSize, segment.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
            }
        });
    }
    
    generateFood() {
        this.food = {
            x: Math.floor(Math.random() * this.tileCount),
            y: Math.floor(Math.random() * this.tileCount)
        };
        
        // Make sure food doesn't spawn on snake
        for (let segment of this.snake) {
            if (segment.x === this.food.x && segment.y === this.food.y) {
                this.generateFood();
                return;
            }
        }
    }
    
    drawFood() {
        this.ctx.fillStyle = '#f44336';
        this.ctx.fillRect(this.food.x * this.gridSize, this.food.y * this.gridSize, this.gridSize - 2, this.gridSize - 2);
        
        // Add apple stem
        this.ctx.fillStyle = '#4CAF50';
        this.ctx.fillRect(this.food.x * this.gridSize + 8, this.food.y * this.gridSize - 2, 4, 4);
    }
    
    checkGameOver() {
        // Check wall collision
        if (this.snake[0].x < 0 || this.snake[0].x >= this.tileCount || 
            this.snake[0].y < 0 || this.snake[0].y >= this.tileCount) {
            return true;
        }
        
        // Check self collision
        for (let i = 1; i < this.snake.length; i++) {
            if (this.snake[0].x === this.snake[i].x && this.snake[0].y === this.snake[i].y) {
                return true;
            }
        }
        
        return false;
    }
    
    endGame() {
        this.gameRunning = false;
        
        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            this.highScoreElement.textContent = this.highScore;
            localStorage.setItem('snakeHighScore', this.highScore);
        }
        
        // Show game over screen
        this.finalScoreElement.textContent = this.score;
        this.gameOverElement.style.display = 'flex';
        
        // Reset buttons
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('pauseBtn').textContent = 'Pause';
    }
    
    saveScore() {
        // Send score to server
        fetch('/game_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score: this.score })
        }).catch(error => {
            console.log('Score not saved:', error);
        });
    }
    
    draw() {
        this.clearCanvas();
        this.drawFood();
        this.drawSnake();
    }
}

// Global function for game over screen
function resetGame() {
    if (window.game) {
        window.game.resetGame();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.game = new SnakeGame();
    
    // Add touch controls for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', function(e) {
        if (!window.game.gameRunning || window.game.gamePaused) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Minimum swipe distance
        if (absDeltaX < 50 && absDeltaY < 50) return;
        
        const goingUp = window.game.dy === -1;
        const goingDown = window.game.dy === 1;
        const goingRight = window.game.dx === 1;
        const goingLeft = window.game.dx === -1;
        
        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0 && !goingLeft) {
                // Swipe right
                window.game.dx = 1;
                window.game.dy = 0;
            } else if (deltaX < 0 && !goingRight) {
                // Swipe left
                window.game.dx = -1;
                window.game.dy = 0;
            }
        } else {
            // Vertical swipe
            if (deltaY > 0 && !goingUp) {
                // Swipe down
                window.game.dx = 0;
                window.game.dy = 1;
            } else if (deltaY < 0 && !goingDown) {
                // Swipe up
                window.game.dx = 0;
                window.game.dy = -1;
            }
        }
    });
});