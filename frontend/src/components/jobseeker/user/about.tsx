import aboutimg from '../../../assets/aboutimg.png'

const About = () => {
    return (
        <div className="flex flex-col min-h-screen bg-white text-gray-800">
            
            <div className="flex flex-col md:flex-row items-center justify-center px-6 py-12 max-w-7xl mx-auto">  
                <div className="w-full md:w-1/2 hidden md:block">
                    <img
                        src={aboutimg}
                        alt="Team working together"
                        className="w-full h-[70%] object-cover rounded-lg shadow-lg"
                    />
                </div>
                <div className="w-full md:w-1/2 pl-6 mb-8 md:mb-0 md:pr-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        About Quick Jobs
                    </h1>
                    <p className="text-lg text-gray-600 mb-6">
                        We are a human resource solutions company dedicated to helping businesses grow by empowering their people.
                        Our team bridges the gap between talent and opportunity, creating meaningful professional connections.
                    </p>
                    <p className="text-gray-600 mb-4">
                        Whether you're scaling a startup or optimizing an enterprise workforce, our HR experts work as an extension
                        of your leadership team, enabling you to focus on the core aspects of your business while we deliver
                        customized solutions that align with your goals.
                    </p>
                    <p className="text-gray-600 mb-4">
                        That's why we prioritize not just recruitment, but the full employee lifecycle from talent acquisition and onboarding to training,
                        retention, and performance development. Our tailored strategies ensure the right people are in the right roles,
                        thriving within a culture that supports growth and innovation.
                    </p>
                </div>
            </div>

            {/* Values */}
            <div className="bg-gray-50 py-16">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-8">Our Core Values</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 text-left">
                        {[
                            {
                                title: "People First",
                                desc: "We believe that people are the most valuable asset of any organization.",
                            },
                            {
                                title: "Integrity",
                                desc: "We operate with transparency, honesty, and respect in everything we do.",
                            },
                            {
                                title: "Innovation",
                                desc: "We use smart tools and forward-thinking strategies to meet evolving HR needs.",
                            },
                        ].map((value, index) => (
                            <div
                                key={index}
                                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-transform duration-300"
                            >
                                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                                <p className="text-gray-600">{value.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Contact Section */}
            <div className="bg-white py-16 px-6 md:px-0">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 items-start">
                    {/* Google Maps Embed */}
                    <div className="w-full h-[400px]">
                        <iframe
                            title="Company Location"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.024359011829!2d85.3239607752413!3d27.717245824165795!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb1909b0f4ab05%3A0xe57f5f3b6d4b3a55!2sKathmandu!5e0!3m2!1sen!2snp!4v1629198745864!5m2!1sen!2snp"
                            width="100%"
                            height="100%"
                            className="rounded-lg shadow-md border-0"
                            allowFullScreen
                            loading="lazy"
                        ></iframe>
                    </div>

                    {/* Contact Form */}
                    <div className="w-full">
                        <h2 className="text-3xl font-semibold mb-6">Get in Touch</h2>
                        <form className="space-y-4">
                            <div>
                                <label className="block text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Your Name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 mb-1">Message</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="How can we help you?"
                                    required
                                ></textarea>
                            </div>
                            <button
                                className="bg-primary text-white px-6 py-2 rounded-lg shadow hover:bg-primary hover:scale-105 transition"
                            >
                                Send Message
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
